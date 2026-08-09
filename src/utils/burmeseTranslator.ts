/**
 * Dictionary & Automatic Translator for Product Names to Burmese (မြန်မာဘာသာ)
 * Specifically translates products sold by Sumalee Food Saraburi Co., Ltd.
 */

// Dictionary mapping for explicit Thai product names to Burmese script
const PRODUCT_BURMESE_MAP: Record<string, string> = {
  // Shallot products
  'หอมเจียว': 'ကြက်သွန်နီကြော်',
  'หอมเจียว500กรัม': 'ကြက်သွန်နီကြော် (500 ဂရမ်)',
  'หอมเจียว 500กรัม': 'ကြက်သွန်နီကြော် (500 ဂရမ်)',
  'หอมเจียว5kg': 'ကြက်သွန်နီကြော် (5 ကီလိုဂရမ်)',
  'หอมเจียว 5kg': 'ကြက်သွန်နီကြော် (5 ကီလိုဂရမ်)',
  'หอมเจียว100กรัม': 'ကြက်သွန်နီကြော် (100 ဂရမ်)',
  'หอมเจียวสูตรB': 'ကြက်သွန်နီကြော် (စုတ် B)',
  'หอมเจียวสูตร C': 'ကြက်သွန်နီကြော် (စုတ် C)',
  'หอมเจียวยางแดง': 'ကြက်သွန်နီကြော် (နီ)',
  'หอมเจียวยางเขียวA': 'ကြက်သွန်နီကြော် (စိမ်း A)',
  'หอมเจียวยางเขียวB': 'ကြက်သွန်နီကြော် (စိမ်း B)',
  'หอมเจียว สลัดน้ำมัน 60%': 'ကြက်သွန်နီကြော် (ဆီစစ် 60%)',
  'หอมแดงแผ่นสด (กก.)': 'ကြက်သွန်နီလတ်ဆတ်',
  'หอมแดงแผ่นสด': 'ကြက်သွန်နီလတ်ဆတ်',
  'หอมหัวใหญ่สด (กก.)': 'ကြက်သွန်နီကြီး',
  'หอมหัวใหญ่สด': 'ကြက်သွန်နီကြီး',

  // Garlic products
  'กระเทียมเจียว': 'ကြက်သွန်ဖြူကြော်',
  'กระเทียมเจียวA': 'ကြက်သွန်ဖြူကြော် (A)',
  'กระเทียมเจียวB': 'ကြက်သွန်ဖြူကြော် (B)',
  'กระเทียมเจียวC': 'ကြက်သွန်ဖြူကြော် (C)',
  'กระเทียมเจียวD': 'ကြက်သွန်ဖြူကြော် (D)',
  'กระเทียมเจียวรอง': 'ကြက်သွန်ဖြူကြော် (အလတ်)',
  'กระเทียมสับละเอียด': 'ကြက်သွန်ဖြူနုတ်နုတ်စဉ်း',
  'กระเทียมหัวใหญ่ คัดเกรด (กก.)': 'ကြက်သွန်ဖြူကြီး',
  'กระเทียมแกะกลีบ (กก.)': 'ကြက်သွန်ဖြူ အမွှာ',

  // Chili products
  'พริกผัดน้ำมัน (กก.)': 'ငရုတ်သီးဆီချက်',
  'พริกผัดน้ำมัน': 'ငရုတ်သီးဆီချက်',
  'พริกผัด': 'ငရုတ်သီးဆီချက်',
  'พริกแห้งคั่ว (กก.)': 'ငရုတ်သီးခြောက်လှော်',
  'พริกแห้งทอด': 'ငရုတ်သီးခြောက်ကြော်',
  'พริกแห้ง': 'ငရုတ်သီးခြောက်',
  'พริกแห้งบด': 'ငရုတ်သီးခြောက်ထောင်း',
  'พริกป่นละเอียด (กก.)': 'ငရုတ်သီးမှုန့်',
  'พริกป่นเผ็ดแท้': 'ငရုတ်သီးမှုန့် (အစပ်)',
  'พริกป่นเผ็ดรอง': 'ငရုတ်သီးမှုန့် (အလတ်)',
  'พริกจินดาแดงสด (กก.)': 'ငရုတ်သီးစိမ်းสด',
  'น้ำพริกเผาสูตรเด็ด': 'ငရုတ်သီးချက်',
  'พริกน้ำตาล': 'ငရုတ်သီးသကြား',
  'พริกน้ำส้มแว่น': 'ငရုတ်သီးစကြို',
  'พริกแกงแดงละเอียด': 'အနီရောင်ငရုတ်သီးဟင်းနှစ်',

  // Peanut / Bean products
  'ถั่วคั่ว': 'မြေပဲလှော်',
  'ถั่วทอด': 'မြေပဲကြော်',
  'ถั่วป่น': 'မြေပဲထောင်း',

  // Rice / Meat presets
  'ข้าวหอมมะลิ คัดพิเศษ (กก.)': 'သင်းပျံ့ကြေးမုံဆန်',
  'เนื้อหมูสันนอกสด (กก.)': 'ဝက်သားလတ်ဆတ်',
  'น่องไก่ติดสะโพกสด (กก.)': 'ကြက်ပေါင်သား'
};

/**
 * Translates a Thai product name into Burmese script automatically.
 * Returns Burmese text, with fallback rule-based component replacement.
 */
export function translateProductToBurmese(productName: string): string {
  if (!productName || !productName.trim()) return '';

  const trimmed = productName.trim();

  // 1. Exact match lookup
  if (PRODUCT_BURMESE_MAP[trimmed]) {
    return PRODUCT_BURMESE_MAP[trimmed];
  }

  // 2. Component/Keyword based smart translation
  let burmeseParts: string[] = [];
  let nameSub = trimmed;

  // Detect main base product
  if (nameSub.includes('หอมเจียว')) {
    burmeseParts.push('ကြက်သွန်နီကြော်'); // Fried Shallots
  } else if (nameSub.includes('กระเทียมเจียว')) {
    burmeseParts.push('ကြက်သွန်ဖြူကြော်'); // Fried Garlic
  } else if (nameSub.includes('กระเทียม')) {
    burmeseParts.push('ကြက်သွန်ဖြူ'); // Garlic
  } else if (nameSub.includes('หอมแดง') || nameSub.includes('หอมใหญ่')) {
    burmeseParts.push('ကြက်သွန်နီ'); // Shallot/Onion
  } else if (nameSub.includes('พริกผัด')) {
    burmeseParts.push('ငရုတ်သီးဆီချက်'); // Chili Oil/Fried Chili
  } else if (nameSub.includes('พริกป่น')) {
    burmeseParts.push('ငရုတ်သီးမှုန့်'); // Chili Powder
  } else if (nameSub.includes('พริกแห้ง')) {
    burmeseParts.push('ငရုတ်သီးခြောက်'); // Dried Chili
  } else if (nameSub.includes('พริก')) {
    burmeseParts.push('ငရုတ်သီး'); // Chili
  } else if (nameSub.includes('ถั่วป่น')) {
    burmeseParts.push('မြေပဲထောင်း'); // Crushed Peanuts
  } else if (nameSub.includes('ถั่วทอด')) {
    burmeseParts.push('မြေပဲကြော်'); // Fried Peanuts
  } else if (nameSub.includes('ถั่วคั่ว')) {
    burmeseParts.push('မြေပဲလှော်'); // Roasted Peanuts
  } else if (nameSub.includes('ถั่ว')) {
    burmeseParts.push('မြေပဲ'); // Peanut
  }

  // If no base component matched, fallback to general Burmese label
  if (burmeseParts.length === 0) {
    return `ပစ္စည်း (${trimmed})`;
  }

  // Detect weights or sizes in name
  if (/500\s*กรัม|500g/i.test(nameSub)) {
    burmeseParts.push('500 ဂရမ်');
  } else if (/100\s*กรัม|100g/i.test(nameSub)) {
    burmeseParts.push('100 ဂရမ်');
  } else if (/5\s*kg|5\s*กก|5\s*กิโล/i.test(nameSub)) {
    burmeseParts.push('5 ကီလိုဂရမ်');
  } else if (/10\s*kg|10\s*กก|10\s*กิโล/i.test(nameSub)) {
    burmeseParts.push('10 ကီလိုဂရမ်');
  }

  // Detect grade/formula A/B/C/D
  const formulaMatch = nameSub.match(/สูตร\s*([a-d|A-D])/i) || nameSub.match(/([a-d|A-D])$/i);
  if (formulaMatch) {
    burmeseParts.push(`(${formulaMatch[1].toUpperCase()})`);
  }

  return burmeseParts.join(' ');
}
