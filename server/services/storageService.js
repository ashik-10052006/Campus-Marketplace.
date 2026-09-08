const path = require('path');
const fs = require('fs');

// Pure local filesystem storage is the default
const uploadImage = async (file, folder = 'products') => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const provider = process.env.STORAGE_PROVIDER || 'local';

  // 1. Database Storage (stores image directly in MongoDB as Base64 Data URI)
  // Recommended for free cloud hosting (Render/Railway) without Cloudinary
  if (provider === 'database' || provider === 'db' || provider === 'base64') {
    const mimeType = file.mimetype || 'image/jpeg';
    return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
  }

  // 2. Cloudinary Storage (only if explicitly enabled)
  if (provider === 'cloudinary' && process.env.CLOUDINARY_CLOUD_NAME) {
    const cloudinary = require('../config/cloudinary');
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `campus_marketplace/${folder}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        (error, result) => {
          if (error) {
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  // 2. Local Filesystem Storage
  const targetDir = path.join(__dirname, '..', 'uploads', folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${folder.replace(/s$/, '')}-${uniqueSuffix}${ext}`;
  const filePath = path.join(targetDir, filename);

  fs.writeFileSync(filePath, file.buffer);

  // Return relative URL served via Express static middleware
  return `/uploads/${folder}/${filename}`;
};

module.exports = {
  uploadImage,
};
