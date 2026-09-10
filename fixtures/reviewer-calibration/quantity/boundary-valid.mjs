export function totalQuantity(items) {
  let total = 0;
  for (const item of items) {
    const quantity = item.quantity;
    total += quantity === null || quantity === undefined ? 1 : quantity;
  }
  return total;
}
