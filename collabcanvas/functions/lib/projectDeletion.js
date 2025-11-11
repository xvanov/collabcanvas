"use strict";
/**
 * Cloud Function to delete project and all subcollections
 * This function recursively deletes all subcollections when a project is deleted
 *
 * Note: This requires Firebase Admin SDK and should be deployed as a Cloud Function
 * For now, this is a placeholder - actual implementation requires:
 * 1. Firebase Admin SDK initialization
 * 2. Proper error handling and logging
 * 3. Testing with Firebase emulator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProjectSubcollections = void 0;
// TODO: Uncomment and configure when ready to deploy
// import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
// import { getFirestore } from 'firebase-admin/firestore';
// const db = getFirestore();
/**
 * Recursively delete all subcollections of a project document
 *
 * Subcollections to delete:
 * - /projects/{projectId}/boards/{boardId}
 * - /projects/{projectId}/scope
 * - /projects/{projectId}/cpm
 * - /projects/{projectId}/bom
 *
 * This function should be triggered when a project document is deleted
 */
async function deleteProjectSubcollections(projectId) {
    // TODO: Implement Cloud Function using Firebase Admin SDK
    // This requires:
    // 1. Initialize Firebase Admin SDK
    // 2. Get reference to project document
    // 3. List all subcollections
    // 4. Recursively delete all documents in subcollections
    // 5. Handle errors gracefully
    console.log(`[TODO] Delete subcollections for project ${projectId}`);
    console.log('[TODO] This requires Cloud Function deployment with Firebase Admin SDK');
    // Placeholder implementation
    // In production, this would be:
    // const projectRef = db.collection('projects').doc(projectId);
    // const subcollections = ['boards', 'scope', 'cpm', 'bom'];
    // for (const subcollectionName of subcollections) {
    //   const subcollectionRef = projectRef.collection(subcollectionName);
    //   const snapshot = await subcollectionRef.get();
    //   const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    //   await Promise.all(deletePromises);
    // }
}
exports.deleteProjectSubcollections = deleteProjectSubcollections;
// TODO: Uncomment when ready to deploy Cloud Function
// export const onProjectDeleted = onDocumentDeleted(
//   'projects/{projectId}',
//   async (event) => {
//     const projectId = event.params.projectId;
//     try {
//       await deleteProjectSubcollections(projectId);
//       console.log(`Successfully deleted all subcollections for project ${projectId}`);
//     } catch (error) {
//       console.error(`Error deleting subcollections for project ${projectId}:`, error);
//     }
//   }
// );
//# sourceMappingURL=projectDeletion.js.map