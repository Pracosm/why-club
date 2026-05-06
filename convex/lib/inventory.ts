export function assertInventoryAvailable(args: {
  productTitle: string;
  requestedQuantity: number;
  inventoryCount: number;
}) {
  if (args.requestedQuantity > args.inventoryCount) {
    throw new Error(`${args.productTitle} does not have enough inventory.`);
  }
}

export function decrementInventoryCount(currentCount: number, quantity: number) {
  const nextCount = currentCount - quantity;
  if (nextCount < 0) {
    throw new Error("Inventory cannot be negative.");
  }
  return nextCount;
}
