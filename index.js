require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const SOURCE_IMG_DIRECTORY = process.env.SOURCE_IMG_DIRECTORY;
const DEST_IMG_DIRECTORY = process.env.DEST_IMG_DIRECTORY;

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".avif",
  ".heic",
  ".heif",
  ".webp",
]);

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function collectImageFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectImageFiles(fullPath)));
    } else if (entry.isFile() && isImageFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getDestPath(sourceDir, destDir, sourcePath) {
  const relativePath = path.relative(sourceDir, sourcePath);
  const { dir, name } = path.parse(relativePath);

  return path.join(destDir, dir, `${name}.webp`);
}

async function convertImage(sourceDir, destDir, sourcePath) {
  const destPath = getDestPath(sourceDir, destDir, sourcePath);

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await sharp(sourcePath).webp().toFile(destPath);

  return { sourcePath, destPath };
}

async function main() {
  if (!SOURCE_IMG_DIRECTORY || !DEST_IMG_DIRECTORY) {
    throw new Error(
      "SOURCE_IMG_DIRECTORY and DEST_IMG_DIRECTORY must be set in .env"
    );
  }

  const sourceDir = path.resolve(SOURCE_IMG_DIRECTORY);
  const destDir = path.resolve(DEST_IMG_DIRECTORY);

  await fs.access(sourceDir);

  const imageFiles = await collectImageFiles(sourceDir);

  if (imageFiles.length === 0) {
    console.log(`No image files found in ${sourceDir}`);
    return;
  }

  console.log(`Converting ${imageFiles.length} image(s)...`);

  for (const sourcePath of imageFiles) {
    const { destPath } = await convertImage(sourceDir, destDir, sourcePath);
    console.log(`${sourcePath} -> ${destPath}`);
  }

  console.log(`Done. Output saved to ${destDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
