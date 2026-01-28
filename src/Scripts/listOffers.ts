import { RecruiteeClient } from '../Recruitee/RecruiteeClient';
import { getConfig } from '../config';
import { inspect } from 'util';

const config = getConfig();
const recruitee = new RecruiteeClient(config.recruitee!);

recruitee.getOffers().then((offers) => {
  // Prints all offers including tags (tags are fetched via individual offer detail calls in getOffers()).
  console.log(inspect(offers, false, 10));
});
