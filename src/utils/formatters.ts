export const toPersianDigits = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w]);
};

export const formatPrice = (price: number): string => {
  return toPersianDigits(price.toLocaleString('fa-IR'));
};

export const formatCurrency = (price: number): string => {
  return `${formatPrice(price)} تومان`;
};

export const getSideTitle = (side: 'left' | 'right' | 'pair' | 'standard'): string => {
  switch (side) {
    case 'left':
      return 'سمت چپ (راننده)';
    case 'right':
      return 'سمت راست (شاگرد)';
    case 'pair':
      return 'ست جفت (چپ + راست)';
    case 'standard':
      return 'استاندارد (تک‌واحد)';
    default:
      return '';
  }
};
