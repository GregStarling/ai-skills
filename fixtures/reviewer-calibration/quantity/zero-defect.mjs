export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);
