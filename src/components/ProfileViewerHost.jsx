import ProfileViewerModal from './ProfileViewerModal';

export default function ProfileViewerHost({
  editAddressForm,
  getPartialShipPreferenceLabel,
  groupedHistory,
  historyOrders,
  isBtnLoading,
  isEditingAddress,
  onClose,
  partialShipOptions,
  profile,
  saveEditedAddress,
  setEditAddressForm,
  setIsEditingAddress,
  shippingOptions,
  startEditingAddress,
  currentOrders,
}) {
  return (
    <ProfileViewerModal
      currentOrders={currentOrders}
      editAddressForm={editAddressForm}
      getPartialShipPreferenceLabel={getPartialShipPreferenceLabel}
      groupedHistory={groupedHistory}
      historyOrders={historyOrders}
      isBtnLoading={isBtnLoading}
      isEditingAddress={isEditingAddress}
      onClose={onClose}
      profile={profile}
      saveEditedAddress={saveEditedAddress}
      setEditAddressForm={setEditAddressForm}
      setIsEditingAddress={setIsEditingAddress}
      shippingOptions={shippingOptions}
      partialShipOptions={partialShipOptions}
      startEditingAddress={startEditingAddress}
    />
  );
}
