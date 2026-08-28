export function getBusinessName() {
  return (
    process.env.NEXT_PUBLIC_BUSINESS_NAME || "Anumde Authentic Ghanaian Meals"
  );
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
