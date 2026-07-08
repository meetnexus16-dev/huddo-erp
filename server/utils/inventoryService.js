import ProductVariant from '../models/ProductVariant.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

/** First-created variant for a product + size — the single stock pool for that size. */
export async function findCanonicalVariantForSize(productId, size) {
  return ProductVariant.findOne({
    product: productId,
    size: String(size),
    is_deleted: { $ne: true }
  })
    .sort({ createdAt: 1 })
    .populate('product');
}

/**
 * Applies a stock delta to a product variant and records an immutable
 * inventory transaction. Positive delta = add, negative delta = deduct.
 * Returns the refreshed variant and the created transaction.
 */
export async function adjustVariantStock({
  variantId,
  variant: providedVariant,
  delta,
  type,
  source = 'manual',
  referenceType,
  referenceId,
  referenceLabel,
  note,
  user
}) {
  const variant = providedVariant || await ProductVariant.findById(variantId);
  if (!variant) {
    throw new Error('Product variant not found.');
  }

  const current = Number(variant.stock_quantity) || 0;
  const next = Math.max(0, current + Number(delta));
  variant.stock_quantity = next;
  await variant.save();

  const productId = variant.product?._id || variant.product;

  const txn = await InventoryTransaction.create({
    product: productId,
    product_variant: variant._id,
    type: type || (delta >= 0 ? 'add' : 'deduct'),
    quantity: Math.abs(Number(delta)),
    balance_after: next,
    source,
    reference_type: referenceType,
    reference_id: referenceId,
    reference_label: referenceLabel,
    note,
    performed_by: user?._id,
    performed_by_name: user?.name
  });

  return { variant, transaction: txn };
}
