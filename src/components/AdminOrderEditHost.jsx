import { useMemo } from 'react';
import AdminOrderEditModal from './AdminOrderEditModal';
import { buildLegacyProductPriceLookup, mergeAdminEditProducts } from '../admin-order-edit-helpers.js';

export default function AdminOrderEditHost({
  adminCart,
  adminInputSm,
  adminModalSearchQuery,
  adminOrderEditTarget,
  adminOrderRows,
  enrichedProducts,
  isBtnLoading,
  normalizedAdminModalSearchQuery,
  onChangeQty,
  onClose,
  onSave,
  safetyRecords,
  setSearchQuery,
  targetProfile,
}) {
  const legacyProductPriceLookup = useMemo(
    () => buildLegacyProductPriceLookup(safetyRecords),
    [safetyRecords]
  );

  const filteredProducts = useMemo(() => (
    mergeAdminEditProducts(enrichedProducts, adminOrderRows)
      .map((product) => (
        product.isLegacyMissing
          ? { ...product, pricePerVialUSD: Number(legacyProductPriceLookup[product.name] || product.pricePerVialUSD || 0) }
          : product
      ))
      .filter((product) => !normalizedAdminModalSearchQuery || product.name.toLowerCase().includes(normalizedAdminModalSearchQuery))
      .sort((left, right) => {
        const leftInOrder = Number(adminCart[left.name] || 0) > 0;
        const rightInOrder = Number(adminCart[right.name] || 0) > 0;
        if (leftInOrder && !rightInOrder) return -1;
        if (!leftInOrder && rightInOrder) return 1;
        return left.name.localeCompare(right.name);
      })
  ), [adminCart, adminOrderRows, enrichedProducts, legacyProductPriceLookup, normalizedAdminModalSearchQuery]);

  return (
    <AdminOrderEditModal
      adminCart={adminCart}
      adminInputSm={adminInputSm}
      filteredProducts={filteredProducts}
      isBtnLoading={isBtnLoading}
      onChangeQty={onChangeQty}
      onClose={onClose}
      onSave={onSave}
      searchQuery={adminModalSearchQuery}
      setSearchQuery={setSearchQuery}
      targetEmail={adminOrderEditTarget}
      targetProfile={targetProfile}
    />
  );
}
