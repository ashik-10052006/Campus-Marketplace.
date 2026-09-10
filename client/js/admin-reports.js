/**
 * Campus Marketplace - Admin Reports & AI Moderation Controller
 */

let currentReports = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  const filterSelect = document.getElementById('report-filter-status');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => loadReports());
  }

  setupReportsEventListeners();
  await loadReports();
});

function setupReportsEventListeners() {
  const container = document.getElementById('reports-list-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    e.preventDefault();
    const action = btn.getAttribute('data-action');
    const reportId = btn.getAttribute('data-report-id');
    if (!reportId) return;

    const report = currentReports.find((r) => String(r._id) === String(reportId));

    if (action === 'classify') {
      const product = report && report.product ? report.product : {};
      await classifyWithAi(
        reportId,
        report ? report.reason : '',
        report ? report.description : '',
        product.name || '',
        product.description || ''
      );
    } else if (action === 'status') {
      const status = btn.getAttribute('data-status');
      const removeProduct = btn.getAttribute('data-remove') === 'true';
      await updateStatus(reportId, status, removeProduct);
    }
  });
}

async function loadReports() {
  const container = document.getElementById('reports-list-container');
  const filterSelect = document.getElementById('report-filter-status');
  const status = filterSelect ? filterSelect.value : 'PENDING';

  if (!container) return;

  container.innerHTML = `
    <div class="spinner-wrapper">
      <div class="spinner"></div>
      <span class="spinner-text">Loading reports...</span>
    </div>
  `;

  try {
    const res = await window.API.getReports({ status, limit: 30 });
    if (res.success && res.data && res.data.reports) {
      currentReports = res.data.reports;

      if (currentReports.length === 0) {
        window.Utils.renderEmptyState(container, {
          title: 'Moderation queue clean!',
          subtitle: `No ${status ? status.toLowerCase() : ''} reports found.`,
          icon: '🛡️',
        });
        return;
      }

      container.innerHTML = currentReports
        .map((r) => {
          const product = r.product || {};
          const reporter = r.reportedBy || {};

          return `
            <div class="report-item-card" id="report-${r._id}">
              <div class="report-header">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="badge ${r.status === 'PENDING' ? 'badge-fair' : r.status === 'RESOLVED' ? 'badge-good' : 'badge-default'}">
                    ${r.status}
                  </span>
                  <span style="font-weight: 700; color: var(--danger);">Reason: ${window.Utils.escapeHTML(r.reason)}</span>
                </div>
                <span class="text-muted" style="font-size: 0.85rem;">${window.Utils.formatDate(r.createdAt)}</span>
              </div>

              <div style="display: flex; gap: 1.25rem; align-items: flex-start; margin: 1rem 0; flex-wrap: wrap;">
                ${
                  product.imageUrl
                    ? `<img src="${product.imageUrl}" class="table-thumbnail" style="width: 72px; height: 72px;" alt="${window.Utils.escapeHTML(product.name || 'Listing')}" />`
                    : ''
                }
                <div style="flex: 1; min-width: 240px;">
                  <div style="font-weight: 700; font-size: 1.05rem;">
                    <a href="/product-details.html?id=${product._id}" target="_blank">
                      ${window.Utils.escapeHTML(product.name || 'Listing')} &rarr;
                    </a>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Seller: <strong>${window.Utils.escapeHTML(product.seller ? product.seller.name : 'Unknown')}</strong> &bull;
                    Reported by: <strong>${window.Utils.escapeHTML(reporter.name || 'Student')}</strong> (${window.Utils.escapeHTML(reporter.email || '')})
                  </div>
                </div>
              </div>

              <div class="report-body" style="background: var(--bg-subtle); padding: 0.85rem 1.1rem; border-radius: var(--radius-md);">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.2rem;">Reporter Explanation:</div>
                ${window.Utils.escapeHTML(r.description || 'No additional text provided.')}
              </div>

              <!-- AI Classification Preview -->
              <div id="ai-classification-${r._id}" style="margin: 0.85rem 0; display: none;"></div>

              <div class="report-actions">
                <button type="button" class="btn btn-outline btn-sm" data-action="classify" data-report-id="${r._id}">
                  ✨ AI Classify
                </button>
                ${
                  r.status !== 'REVIEWED'
                    ? `<button type="button" class="btn btn-outline btn-sm" data-action="status" data-report-id="${r._id}" data-status="REVIEWED">Mark Reviewed</button>`
                    : ''
                }
                <button type="button" class="btn btn-outline btn-sm" data-action="status" data-report-id="${r._id}" data-status="REJECTED">Reject Report</button>
                <button type="button" class="btn btn-success btn-sm" data-action="status" data-report-id="${r._id}" data-status="RESOLVED" data-remove="false">Resolve</button>
                <button type="button" class="btn btn-danger btn-sm" data-action="status" data-report-id="${r._id}" data-status="RESOLVED" data-remove="true">Resolve & Remove Item</button>
              </div>
            </div>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Reports load error:', err);
    window.Utils.renderError(container, 'Failed to fetch violation reports.');
  }
}

window.classifyWithAi = async function (reportId, reason, description, productName, productDescription) {
  const container = document.getElementById(`ai-classification-${reportId}`);
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-size: 0.85rem; color: var(--primary);">
      Analyzing report context with Claude AI...
    </div>
  `;

  try {
    const res = await window.API.classifyReport({
      reason,
      description,
      productName,
      productDescription,
    });

    if (res.success && res.data && res.data.classification) {
      const c = res.data.classification;
      container.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.08)); border: 1px solid rgba(79,70,229,0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--primary);">🤖 Claude AI Classification: ${window.Utils.escapeHTML(c.classification)}</span>
            <span class="badge ${c.confidence === 'High' ? 'badge-good' : 'badge-fair'}">Confidence: ${c.confidence}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-main);">${window.Utils.escapeHTML(c.summary)}</div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<span class="text-danger" style="font-size: 0.82rem;">AI Classification unavailable: ${err.message}</span>`;
  }
};

window.updateStatus = async function (reportId, status, removeProduct = false) {
  try {
    const res = await window.API.updateReportStatus(reportId, status, removeProduct);
    if (res.success) {
      window.Utils.showToast(res.message || 'Status updated', 'success');
      loadReports();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to update report', 'error');
  }
};
