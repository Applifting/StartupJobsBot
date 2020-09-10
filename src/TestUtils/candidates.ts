import { StartupJobsPayload } from '../StartupJobs/webhookPayload';

export const mrShark: StartupJobsPayload = {
  date: '2017-09-11T18:19:15+02:00',
  candidateID: 12345,
  offerID: 1234,
  name: 'Pan Žralok',
  position: 'Vývojář webhooků',
  why: 'Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!',
  phone: '+420 725 875 752',
  email: 'dev@startupjobs.cz',
  details: `https://www.startupjobs.cz/admin/zajemce/32437?oid=4332`,
  linkedin: 'https://linkedin.com/pan-zralok',
  internalPositionName: 'JOB1',
  files: ['https://www.startupjobs.cz/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c'],
  gdpr_accepted: true,
};
