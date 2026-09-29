"use server";

/**
 * Точка входа для всех Server Actions админки.
 * Реализации сгруппированы по домену в src/lib/actions/admin/*.
 */

export { loginAdminAction, logoutAdminAction } from "@/lib/actions/admin/auth";
export {
  deleteOrderAction,
  updateOrderAction,
  updateOrderPaymentStatusAction,
  updateOrderStatusAction,
} from "@/lib/actions/admin/orders";
export {
  bulkProductAction,
  changeProductPriceAction,
  createProductAction,
  deleteProductAction,
  deleteProductRelationAction,
  updateProductAction,
  updateProductAttributesAction,
  updateProductDocumentsAction,
  updateProductImagesAction,
  updateProductRelationsAction,
} from "@/lib/actions/admin/products";
export {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryProductsAction,
  moveSelectedProductsAction,
  updateCategoryAction,
  updateCategoryOrderAction,
} from "@/lib/actions/admin/categories";
export {
  createAttributeAction,
  deleteAttributeAction,
  forceDeleteAttributeAction,
  updateAttributeAction,
} from "@/lib/actions/admin/attributes";
export {
  createBrandAction,
  createGenerationAction,
  createModelAction,
  createModificationAction,
  deleteBrandAction,
  deleteGenerationAction,
  deleteModelAction,
  deleteModificationAction,
  updateBrandAction,
  updateGenerationAction,
  updateModelAction,
  updateModificationAction,
} from "@/lib/actions/admin/cars";
export {
  addProductFitmentAction,
  clearProductFitmentsAction,
  createFitmentsAction,
  deleteFitmentAction,
  deleteFitmentsAction,
} from "@/lib/actions/admin/compatibility";
export {
  clearFinishedImportsAction,
  deleteImportJobAction,
  rerunImportAction,
  startImportAction,
} from "@/lib/actions/admin/import";
export {
  createSupplierAction,
  deleteSupplierAction,
  updateSupplierAction,
} from "@/lib/actions/admin/suppliers";
export {
  bulkReviewStatusAction,
  deleteReviewAction,
  deleteReviewReplyAction,
  recalcRatingsAction,
  replyToReviewAction,
  replyToReviewStateAction,
  toggleReviewVerifiedAction,
  updateReviewStatusAction,
} from "@/lib/actions/admin/reviews";
export {
  bulkCallbackSpamAction,
  completeVinCallbackAction,
  deleteCallbackAction,
  setCallbackStatusAction,
  updateCallbackAction,
} from "@/lib/actions/admin/callbacks";
export {
  createBannerAction,
  createPageAction,
  deleteBannerAction,
  deletePageAction,
  toggleBannerAction,
  togglePagePublishedAction,
  updateBannerAction,
  updatePageAction,
} from "@/lib/actions/admin/content";
export {
  createCityAction,
  createPickupPointAction,
  createTariffAction,
  deleteCityAction,
  deletePickupPointAction,
  deleteTariffAction,
  togglePickupPointAction,
  updateCityAction,
  updatePickupPointAction,
  updateTariffAction,
} from "@/lib/actions/admin/geography";
export {
  changeUserRoleAction,
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserAction,
} from "@/lib/actions/admin/users";
export { saveSettingsAction, saveSingleSettingAction } from "@/lib/actions/admin/settings";
