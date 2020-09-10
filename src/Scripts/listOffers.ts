import { RecruiteeClient } from '../Recruitee/RecruiteeClient';
import { getConfig } from '../config';
import { inspect } from 'util';

const config = getConfig();

const recruitee = new RecruiteeClient(config.recruitee!);

recruitee.getOffers().then((o) => {
  console.log(inspect(o, false, 10));
});
