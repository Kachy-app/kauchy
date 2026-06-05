import cloudinary
import cloudinary.uploader


def detect_media_type(uploaded_file):
    """Return 'video' or 'image' based on the uploaded file's content type."""
    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type.startswith("video"):
        return "video"
    return "image"


def upload_to_cloudinary(uploaded_file, folder, resource_type="image"):
    """Upload a Django UploadedFile to Cloudinary and return its secure URL.

    Mirrors the approach used in customers.views for vendor content. Cloudinary is
    configured globally via CLOUDINARY_STORAGE in settings.
    """
    options = {
        "folder": folder,
        "resource_type": resource_type,
        "invalidate": True,
    }
    if resource_type == "video":
        # Large-file friendly options, matching customers.views.
        options.update({"chunk_size": 6000000, "timeout": 600, "eager_async": True})

    result = cloudinary.uploader.upload(uploaded_file, **options)
    return result["secure_url"]
