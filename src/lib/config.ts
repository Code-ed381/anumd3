export function getBusinessName() {
  return process.env.NEXT_PUBLIC_BUSINESS_NAME || "Kitchen Pre-Order";
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
