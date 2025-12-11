/**
 * Firebase Cloud Functions Entry Point
 */

import { aiCommand } from './aiCommand';
import { materialEstimateCommand } from './materialEstimateCommand';
import { getHomeDepotPrice } from './pricing';
import { sagemakerInvoke } from './sagemakerInvoke';
import { comparePrices } from './priceComparison';
// import { onProjectDeleted } from './projectDeletion'; // TODO: Uncomment when ready to deploy

export { aiCommand, materialEstimateCommand, getHomeDepotPrice, sagemakerInvoke, comparePrices };
// export { onProjectDeleted }; // TODO: Uncomment when ready to deploy
