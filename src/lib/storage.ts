import { createServiceSupabase, DISH_PHOTOS_BUCKET } from "@/lib/supabase";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function validateDishPhoto(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Use a JPEG, PNG, or WebP image";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Image must be under 5 MB";
  }
  if (file.size === 0) {
    return "A dish photo is required";
  }
  return null;
}

export async function uploadDishPhoto(file: File) {
  const validationError = validateDishPhoto(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createServiceSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(DISH_PHOTOS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(DISH_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
