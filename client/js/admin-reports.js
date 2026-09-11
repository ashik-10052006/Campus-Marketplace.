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
        product.description || '',
        btn
      );
    } else if (action === 'status') {
      const status = btn.getAttribute('data-status');
      const removeProduct = btn.getAttribute('data-remove') === 'true';
      await updateStatus(reportId, status, removeProduct, btn);
    }
  });
}

async function loadReports() {
  const container = document.getElementById('reports-list-container');
  const filterSelect = document.getElementById('report-filter-status');
  const status = filterSelect ? filterSelect.value : 'PENDING';

  if (!container) return;

  container.innerHTML = `
    <div class="spinner-wrapper" style="padding: 3.5rem 1rem;">
      <div class="spinner"></div>
      <span class="spinner-text">Loading moderation reports...</span>
    </div>
  `;

  try {
    const res = await window.API.getReports({ status, limit: 30 });
    if (res.success && res.data && res.data.reports) {
      currentReports = res.data.reports;

      if (currentReports.length === 0) {
        window.Utils.renderEmptyState(container, {
          title: 'Moderation queue clean!',
          subtitle: `No ${status ? status.toLowerCase() : ''} reports found in the system.`,
          icon: '🛡️',
        });
        return;
      }

      container.innerHTML = currentReports
        .map((r) => {
          const product = r.product || {};
          const reporter = r.reportedBy || {};
          const defaultImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=160&auto=format&fit=crop&q=80';
          const imgUrl = product.imageUrl || (product.images && product.images[0]) || defaultImg;

          return `
            <div class="report-item-card" id="report-${r._id}">
              <div class="report-header">
                <div class="report-status-wrap">
                  <span class="badge ${
                    r.status === 'PENDING'
                      ? 'badge-fair'
                      : r.status === 'RESOLVED'
                      ? 'badge-good'
                      : r.status === 'REVIEWED'
                      ? 'badge-accent'
                      : 'badge-default'
                  }">
                    ${r.status}
                  </span>
                  <span class="report-reason-tag">
                    <span>⚠️</span> Reason: ${window.Utils.escapeHTML(r.reason)}
                  </span>
                </div>
                <span class="report-date">${window.Utils.formatDate(r.createdAt)}</span>
              </div>

              <div class="report-product-preview">
                <img src="${imgUrl}" class="report-product-thumb" alt="${window.Utils.escapeHTML(product.name || 'Listing')}" onerror="this.src='${defaultImg}'" />
                <div class="report-product-info">
                  <a href="/product-details.html?id=${product._id}" class="report-product-title" target="_blank">
                    ${window.Utils.escapeHTML(product.name || 'Listing')} &rarr;
                  </a>
                  <div class="report-product-meta">
                    Seller: <strong>${window.Utils.escapeHTML(product.seller ? product.seller.name : 'Unknown')}</strong> &bull;
                    Reported by: <strong>${window.Utils.escapeHTML(reporter.name || 'Student')}</strong> (${window.Utils.escapeHTML(reporter.email || '')})
                  </div>
                </div>
              </div>

              <div class="report-explanation-box">
                <div class="report-explanation-title">Reporter Statement</div>
                <div class="report-explanation-text">${window.Utils.escapeHTML(r.description || 'No additional details submitted by reporter.')}</div>
              </div>

              <!-- AI Classification Preview -->
              <div id="ai-classification-${r._id}" style="display: none;"></div>

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

window.classifyWithAi = async function (reportId, reason, description, productName, productDescription, triggerBtn) {
  const container = document.getElementById(`ai-classification-${reportId}`);
  if (!container) return;

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Analyzing...';
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="ai-classification-box" style="display: flex; align-items: center; gap: 0.65rem; color: var(--primary); font-size: 0.88rem;">
      <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      <span>Claude AI is analyzing report details and listing context...</span>
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
      const isViolation = (c.classification || '').toLowerCase().includes('spam') ||
                          (c.classification || '').toLowerCase().includes('scam') ||
                          (c.classification || '').toLowerCase().includes('inappropriate');

      container.innerHTML = `
        <div class="ai-classification-box">
          <div class="ai-classification-header">
            <span class="ai-classification-badge">
              <span>🤖</span> Claude AI: ${window.Utils.escapeHTML(c.classification)}
            </span>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span class="ai-risk-pill ${isViolation ? 'ai-risk-high' : 'ai-risk-low'}">
                ${isViolation ? 'Action Recommended' : 'Low Risk'}
              </span>
              <span class="badge ${c.confidence === 'High' ? 'badge-good' : 'badge-fair'}" style="font-size: 0.75rem;">
                Confidence: ${c.confidence}
              </span>
            </div>
          </div>
          <div style="font-size: 0.88rem; color: var(--text-main); line-height: 1.45;">
            ${window.Utils.escapeHTML(c.summary)}
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ai-classification-box" style="border-color: var(--danger);">
        <span class="text-danger" style="font-size: 0.85rem;">AI Moderation service unavailable: ${err.message}</span>
      </div>
    `;
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = '✨ Re-classify';
    }
  }
};

window.updateStatus = async function (reportId, status, removeProduct = false, triggerBtn) {
  let promptMsg = `Update report status to ${status}?`;
  if (removeProduct) {
    promptMsg = 'Are you sure you want to RESOLVE this report and REMOVE the listing from the platform?';
  }

  if (!confirm(promptMsg)) return;

  if (triggerBtn) {
    triggerBtn.disabled = true;
  }

  try {
    const res = await window.API.updateReportStatus(reportId, status, removeProduct);
    if (res.success) {
      window.Utils.showToast(`Report marked as ${status}`, 'success');
      loadReports();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to update report', 'error');
    if (triggerBtn) triggerBtn.disabled = false;
  }
};
