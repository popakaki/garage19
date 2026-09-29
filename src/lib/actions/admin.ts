"use server";

/**
 * Точка входа для всех Server Actions админки.
 *
 * Реализации сгруппированы по домену в `src/lib/actions/admin/*`.
 * Здесь — только async-обёртки: Next.js разрешает в файле с директивой
 * "use server" экспортировать исключительно async-функции, а прямой
 * реэкспорт (`export { … } from "…"`) сборка отклоняет.
 *
 * Файл сгенерирован скриптом scripts/generate-admin-actions.cjs —
 * при добавлении новых экшенов проще добавить обёртку вручную,
 * ориентируясь на этот же шаблон.
 */

import * as actions0 from "@/lib/actions/admin/auth";
import * as actions1 from "@/lib/actions/admin/orders";
import * as actions2 from "@/lib/actions/admin/products";
import * as actions3 from "@/lib/actions/admin/categories";
import * as actions4 from "@/lib/actions/admin/attributes";
import * as actions5 from "@/lib/actions/admin/cars";
import * as actions6 from "@/lib/actions/admin/compatibility";
import * as actions7 from "@/lib/actions/admin/import";
import * as actions8 from "@/lib/actions/admin/suppliers";
import * as actions9 from "@/lib/actions/admin/reviews";
import * as actions10 from "@/lib/actions/admin/callbacks";
import * as actions11 from "@/lib/actions/admin/content";
import * as actions12 from "@/lib/actions/admin/geography";
import * as actions13 from "@/lib/actions/admin/users";
import * as actions14 from "@/lib/actions/admin/settings";

export async function loginAdminAction(...args: Parameters<typeof actions0.loginAdminAction>) {
  return actions0.loginAdminAction(...args);
}

export async function logoutAdminAction(...args: Parameters<typeof actions0.logoutAdminAction>) {
  return actions0.logoutAdminAction(...args);
}

export async function deleteOrderAction(...args: Parameters<typeof actions1.deleteOrderAction>) {
  return actions1.deleteOrderAction(...args);
}

export async function updateOrderAction(...args: Parameters<typeof actions1.updateOrderAction>) {
  return actions1.updateOrderAction(...args);
}

export async function updateOrderPaymentStatusAction(...args: Parameters<typeof actions1.updateOrderPaymentStatusAction>) {
  return actions1.updateOrderPaymentStatusAction(...args);
}

export async function updateOrderStatusAction(...args: Parameters<typeof actions1.updateOrderStatusAction>) {
  return actions1.updateOrderStatusAction(...args);
}

export async function bulkProductAction(...args: Parameters<typeof actions2.bulkProductAction>) {
  return actions2.bulkProductAction(...args);
}

export async function changeProductPriceAction(...args: Parameters<typeof actions2.changeProductPriceAction>) {
  return actions2.changeProductPriceAction(...args);
}

export async function createProductAction(...args: Parameters<typeof actions2.createProductAction>) {
  return actions2.createProductAction(...args);
}

export async function deleteProductAction(...args: Parameters<typeof actions2.deleteProductAction>) {
  return actions2.deleteProductAction(...args);
}

export async function deleteProductRelationAction(...args: Parameters<typeof actions2.deleteProductRelationAction>) {
  return actions2.deleteProductRelationAction(...args);
}

export async function updateProductAction(...args: Parameters<typeof actions2.updateProductAction>) {
  return actions2.updateProductAction(...args);
}

export async function updateProductAttributesAction(...args: Parameters<typeof actions2.updateProductAttributesAction>) {
  return actions2.updateProductAttributesAction(...args);
}

export async function updateProductDocumentsAction(...args: Parameters<typeof actions2.updateProductDocumentsAction>) {
  return actions2.updateProductDocumentsAction(...args);
}

export async function updateProductImagesAction(...args: Parameters<typeof actions2.updateProductImagesAction>) {
  return actions2.updateProductImagesAction(...args);
}

export async function updateProductRelationsAction(...args: Parameters<typeof actions2.updateProductRelationsAction>) {
  return actions2.updateProductRelationsAction(...args);
}

export async function createCategoryAction(...args: Parameters<typeof actions3.createCategoryAction>) {
  return actions3.createCategoryAction(...args);
}

export async function deleteCategoryAction(...args: Parameters<typeof actions3.deleteCategoryAction>) {
  return actions3.deleteCategoryAction(...args);
}

export async function moveCategoryProductsAction(...args: Parameters<typeof actions3.moveCategoryProductsAction>) {
  return actions3.moveCategoryProductsAction(...args);
}

export async function moveSelectedProductsAction(...args: Parameters<typeof actions3.moveSelectedProductsAction>) {
  return actions3.moveSelectedProductsAction(...args);
}

export async function updateCategoryAction(...args: Parameters<typeof actions3.updateCategoryAction>) {
  return actions3.updateCategoryAction(...args);
}

export async function updateCategoryOrderAction(...args: Parameters<typeof actions3.updateCategoryOrderAction>) {
  return actions3.updateCategoryOrderAction(...args);
}

export async function createAttributeAction(...args: Parameters<typeof actions4.createAttributeAction>) {
  return actions4.createAttributeAction(...args);
}

export async function deleteAttributeAction(...args: Parameters<typeof actions4.deleteAttributeAction>) {
  return actions4.deleteAttributeAction(...args);
}

export async function forceDeleteAttributeAction(...args: Parameters<typeof actions4.forceDeleteAttributeAction>) {
  return actions4.forceDeleteAttributeAction(...args);
}

export async function updateAttributeAction(...args: Parameters<typeof actions4.updateAttributeAction>) {
  return actions4.updateAttributeAction(...args);
}

export async function createBrandAction(...args: Parameters<typeof actions5.createBrandAction>) {
  return actions5.createBrandAction(...args);
}

export async function createGenerationAction(...args: Parameters<typeof actions5.createGenerationAction>) {
  return actions5.createGenerationAction(...args);
}

export async function createModelAction(...args: Parameters<typeof actions5.createModelAction>) {
  return actions5.createModelAction(...args);
}

export async function createModificationAction(...args: Parameters<typeof actions5.createModificationAction>) {
  return actions5.createModificationAction(...args);
}

export async function deleteBrandAction(...args: Parameters<typeof actions5.deleteBrandAction>) {
  return actions5.deleteBrandAction(...args);
}

export async function deleteGenerationAction(...args: Parameters<typeof actions5.deleteGenerationAction>) {
  return actions5.deleteGenerationAction(...args);
}

export async function deleteModelAction(...args: Parameters<typeof actions5.deleteModelAction>) {
  return actions5.deleteModelAction(...args);
}

export async function deleteModificationAction(...args: Parameters<typeof actions5.deleteModificationAction>) {
  return actions5.deleteModificationAction(...args);
}

export async function updateBrandAction(...args: Parameters<typeof actions5.updateBrandAction>) {
  return actions5.updateBrandAction(...args);
}

export async function updateGenerationAction(...args: Parameters<typeof actions5.updateGenerationAction>) {
  return actions5.updateGenerationAction(...args);
}

export async function updateModelAction(...args: Parameters<typeof actions5.updateModelAction>) {
  return actions5.updateModelAction(...args);
}

export async function updateModificationAction(...args: Parameters<typeof actions5.updateModificationAction>) {
  return actions5.updateModificationAction(...args);
}

export async function addProductFitmentAction(...args: Parameters<typeof actions6.addProductFitmentAction>) {
  return actions6.addProductFitmentAction(...args);
}

export async function clearProductFitmentsAction(...args: Parameters<typeof actions6.clearProductFitmentsAction>) {
  return actions6.clearProductFitmentsAction(...args);
}

export async function createFitmentsAction(...args: Parameters<typeof actions6.createFitmentsAction>) {
  return actions6.createFitmentsAction(...args);
}

export async function deleteFitmentAction(...args: Parameters<typeof actions6.deleteFitmentAction>) {
  return actions6.deleteFitmentAction(...args);
}

export async function deleteFitmentsAction(...args: Parameters<typeof actions6.deleteFitmentsAction>) {
  return actions6.deleteFitmentsAction(...args);
}

export async function clearFinishedImportsAction(...args: Parameters<typeof actions7.clearFinishedImportsAction>) {
  return actions7.clearFinishedImportsAction(...args);
}

export async function deleteImportJobAction(...args: Parameters<typeof actions7.deleteImportJobAction>) {
  return actions7.deleteImportJobAction(...args);
}

export async function rerunImportAction(...args: Parameters<typeof actions7.rerunImportAction>) {
  return actions7.rerunImportAction(...args);
}

export async function startImportAction(...args: Parameters<typeof actions7.startImportAction>) {
  return actions7.startImportAction(...args);
}

export async function createSupplierAction(...args: Parameters<typeof actions8.createSupplierAction>) {
  return actions8.createSupplierAction(...args);
}

export async function deleteSupplierAction(...args: Parameters<typeof actions8.deleteSupplierAction>) {
  return actions8.deleteSupplierAction(...args);
}

export async function updateSupplierAction(...args: Parameters<typeof actions8.updateSupplierAction>) {
  return actions8.updateSupplierAction(...args);
}

export async function bulkReviewStatusAction(...args: Parameters<typeof actions9.bulkReviewStatusAction>) {
  return actions9.bulkReviewStatusAction(...args);
}

export async function deleteReviewAction(...args: Parameters<typeof actions9.deleteReviewAction>) {
  return actions9.deleteReviewAction(...args);
}

export async function deleteReviewReplyAction(...args: Parameters<typeof actions9.deleteReviewReplyAction>) {
  return actions9.deleteReviewReplyAction(...args);
}

export async function recalcRatingsAction(...args: Parameters<typeof actions9.recalcRatingsAction>) {
  return actions9.recalcRatingsAction(...args);
}

export async function replyToReviewAction(...args: Parameters<typeof actions9.replyToReviewAction>) {
  return actions9.replyToReviewAction(...args);
}

export async function toggleReviewVerifiedAction(...args: Parameters<typeof actions9.toggleReviewVerifiedAction>) {
  return actions9.toggleReviewVerifiedAction(...args);
}

export async function updateReviewStatusAction(...args: Parameters<typeof actions9.updateReviewStatusAction>) {
  return actions9.updateReviewStatusAction(...args);
}

export async function bulkCallbackSpamAction(...args: Parameters<typeof actions10.bulkCallbackSpamAction>) {
  return actions10.bulkCallbackSpamAction(...args);
}

export async function completeVinCallbackAction(...args: Parameters<typeof actions10.completeVinCallbackAction>) {
  return actions10.completeVinCallbackAction(...args);
}

export async function deleteCallbackAction(...args: Parameters<typeof actions10.deleteCallbackAction>) {
  return actions10.deleteCallbackAction(...args);
}

export async function setCallbackStatusAction(...args: Parameters<typeof actions10.setCallbackStatusAction>) {
  return actions10.setCallbackStatusAction(...args);
}

export async function updateCallbackAction(...args: Parameters<typeof actions10.updateCallbackAction>) {
  return actions10.updateCallbackAction(...args);
}

export async function createBannerAction(...args: Parameters<typeof actions11.createBannerAction>) {
  return actions11.createBannerAction(...args);
}

export async function createPageAction(...args: Parameters<typeof actions11.createPageAction>) {
  return actions11.createPageAction(...args);
}

export async function deleteBannerAction(...args: Parameters<typeof actions11.deleteBannerAction>) {
  return actions11.deleteBannerAction(...args);
}

export async function deletePageAction(...args: Parameters<typeof actions11.deletePageAction>) {
  return actions11.deletePageAction(...args);
}

export async function toggleBannerAction(...args: Parameters<typeof actions11.toggleBannerAction>) {
  return actions11.toggleBannerAction(...args);
}

export async function togglePagePublishedAction(...args: Parameters<typeof actions11.togglePagePublishedAction>) {
  return actions11.togglePagePublishedAction(...args);
}

export async function updateBannerAction(...args: Parameters<typeof actions11.updateBannerAction>) {
  return actions11.updateBannerAction(...args);
}

export async function updatePageAction(...args: Parameters<typeof actions11.updatePageAction>) {
  return actions11.updatePageAction(...args);
}

export async function createCityAction(...args: Parameters<typeof actions12.createCityAction>) {
  return actions12.createCityAction(...args);
}

export async function createPickupPointAction(...args: Parameters<typeof actions12.createPickupPointAction>) {
  return actions12.createPickupPointAction(...args);
}

export async function createTariffAction(...args: Parameters<typeof actions12.createTariffAction>) {
  return actions12.createTariffAction(...args);
}

export async function deleteCityAction(...args: Parameters<typeof actions12.deleteCityAction>) {
  return actions12.deleteCityAction(...args);
}

export async function deletePickupPointAction(...args: Parameters<typeof actions12.deletePickupPointAction>) {
  return actions12.deletePickupPointAction(...args);
}

export async function deleteTariffAction(...args: Parameters<typeof actions12.deleteTariffAction>) {
  return actions12.deleteTariffAction(...args);
}

export async function togglePickupPointAction(...args: Parameters<typeof actions12.togglePickupPointAction>) {
  return actions12.togglePickupPointAction(...args);
}

export async function updateCityAction(...args: Parameters<typeof actions12.updateCityAction>) {
  return actions12.updateCityAction(...args);
}

export async function updatePickupPointAction(...args: Parameters<typeof actions12.updatePickupPointAction>) {
  return actions12.updatePickupPointAction(...args);
}

export async function updateTariffAction(...args: Parameters<typeof actions12.updateTariffAction>) {
  return actions12.updateTariffAction(...args);
}

export async function changeUserRoleAction(...args: Parameters<typeof actions13.changeUserRoleAction>) {
  return actions13.changeUserRoleAction(...args);
}

export async function createUserAction(...args: Parameters<typeof actions13.createUserAction>) {
  return actions13.createUserAction(...args);
}

export async function deleteUserAction(...args: Parameters<typeof actions13.deleteUserAction>) {
  return actions13.deleteUserAction(...args);
}

export async function resetUserPasswordAction(...args: Parameters<typeof actions13.resetUserPasswordAction>) {
  return actions13.resetUserPasswordAction(...args);
}

export async function toggleUserActiveAction(...args: Parameters<typeof actions13.toggleUserActiveAction>) {
  return actions13.toggleUserActiveAction(...args);
}

export async function updateUserAction(...args: Parameters<typeof actions13.updateUserAction>) {
  return actions13.updateUserAction(...args);
}

export async function saveSettingsAction(...args: Parameters<typeof actions14.saveSettingsAction>) {
  return actions14.saveSettingsAction(...args);
}

export async function saveSingleSettingAction(...args: Parameters<typeof actions14.saveSingleSettingAction>) {
  return actions14.saveSingleSettingAction(...args);
}
