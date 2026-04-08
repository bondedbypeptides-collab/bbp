import { useMemo } from 'react';
import AdminOrderEditModal from './AdminOrderEditModal';

export default function AdminOrderEditHost({
  adminCart,
  adminInputSm,
  adminModalSearchQuery,
  adminOrderEditTarget,
  enrichedProducts,
  isBtnLoading,
  normalizedAdminModalSearchQuery,
  onChangeQty,
  onClose,
  onSave,
  setSearchQuery,
  targetProfile,
}) {
  const filteredProducts = useMemo(() => (
    enrichedProducts
      .filter((product) => !normalizedAdminModalSearchQuery || product.name.toLowerCase().includes(normalizedAdminModalSearchQuery))
      .sort((left, right) => {
        const leftInOrder = Number(adminCart[left.name] || 0) > 0;
        const rightInOrder = Number(adminCart[right.name] || 0) > 0;
        if (leftInOrder && !rightInOrder) return -1;
        if (!leftInOrder && rightInOrder) return 1;
        return left.name.localeCompare(right.name);
      })
  ), [adminCart, enrichedProducts, normalizedAdminModalSearchQuery]);

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
