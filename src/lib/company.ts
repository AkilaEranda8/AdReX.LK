export const companyInfo = {
  name: "ADREX.LK (PVT) LTD",
  brand: "AdReX.LK",
  tagline: "YOUR SUCCESS OUR BUSINESS",
  website: "www.adrexlk.com",
  phones: ["+94 70 420 3048", "+94 71 420 3048"],
  emails: ["adrexlkmarketing@gmail.com", "management.adrexlk@gmail.com"],
  banks: [
    {
      name: "Commercial bank",
      accountNo: "8890036269",
      branch: "Nawalapitiya",
      accountName: "K V I P Dharmathilaka",
    },
    {
      name: "Seylan Bank",
      accountNo: "076013638819120",
      branch: "Nawalapitiya",
      accountName: "K V I P Dharmathilaka",
    },
  ],
  remarks:
    "After making the payment, send a photo or scan copy of the relevant bill along with the invoice number via WhatsApp to +94 70 420 3048 or Email to adrexlkmarketing@gmail.com",
  copyright: `Copyright © ${new Date().getFullYear()} AdReX.LK (PVT) Ltd. All Rights Reserved.`,
};

export const appBranding = {
  name: companyInfo.brand,
  title: `${companyInfo.brand} — Invoice & Quotation Management`,
  description: `Manage clients, invoices, and quotations with ${companyInfo.brand}`,
  tagline: companyInfo.tagline,
  themeStorageKey: "adrexlk-theme",
  copyright: companyInfo.copyright,
};
