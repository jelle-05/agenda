import type { Afspraak, Label } from '@/types'

export const mockLabels: Label[] = [
  { id: 'persoonlijk', naam: 'Persoonlijk', kleur: '#007AFF' },
  { id: 'werk',        naam: 'Werk',        kleur: '#FF3B30' },
  { id: 'gezin',       naam: 'Gezin',       kleur: '#34C759' },
  { id: 'school',      naam: 'School',      kleur: '#FF9500' },
]

export const mockAfspraken: Afspraak[] = [
  { id: '1',  titel: 'Standup',           datum: '2026-06-01', beginTijd: '09:00', eindTijd: '09:30', heeldag: false, labelIds: ['werk'] },
  { id: '2',  titel: 'Design review',     datum: '2026-06-01', beginTijd: '15:00', eindTijd: '16:00', heeldag: false, labelIds: ['werk'] },
  { id: '3',  titel: 'Standup',           datum: '2026-06-02', beginTijd: '09:00', eindTijd: '09:30', heeldag: false, labelIds: ['werk'] },
  { id: '4',  titel: 'Lunch met Jan',     datum: '2026-06-02', beginTijd: '12:00', eindTijd: '13:00', heeldag: false, labelIds: ['persoonlijk'] },
  { id: '5',  titel: 'Sportschool',       datum: '2026-06-03', beginTijd: '07:00', eindTijd: '08:30', heeldag: false, labelIds: ['persoonlijk'] },
  { id: '6',  titel: 'Team meeting',      datum: '2026-06-03', beginTijd: '10:00', eindTijd: '11:00', heeldag: false, labelIds: ['werk'] },
  { id: '7',  titel: 'Project review',    datum: '2026-06-03', beginTijd: '14:00', eindTijd: '15:30', heeldag: false, labelIds: ['werk'] },
  { id: '8',  titel: 'Sportschool',       datum: '2026-06-04', beginTijd: '07:00', eindTijd: '08:30', heeldag: false, labelIds: ['persoonlijk'] },
  { id: '9',  titel: 'Verjaardag mama',   datum: '2026-06-05', beginTijd: '00:00', eindTijd: '23:59', heeldag: true,  labelIds: ['gezin'] },
  { id: '10', titel: 'BBQ',               datum: '2026-06-05', beginTijd: '17:00', eindTijd: '22:00', heeldag: false, labelIds: ['persoonlijk', 'gezin'] },
  { id: '11', titel: 'Standup',           datum: '2026-06-08', beginTijd: '09:00', eindTijd: '09:30', heeldag: false, labelIds: ['werk'] },
  { id: '12', titel: 'Tandarts',          datum: '2026-06-09', beginTijd: '09:30', eindTijd: '10:00', heeldag: false, labelIds: ['persoonlijk'] },
  { id: '13', titel: 'Presentatie klant', datum: '2026-06-10', beginTijd: '13:00', eindTijd: '14:00', heeldag: false, labelIds: ['werk'] },
  { id: '14', titel: 'Weekend BBQ',       datum: '2026-06-13', beginTijd: '15:00', eindTijd: '20:00', heeldag: false, labelIds: ['gezin'] },
  { id: '15', titel: 'Sprint planning',   datum: '2026-06-15', beginTijd: '10:00', eindTijd: '12:00', heeldag: false, labelIds: ['werk'] },
  { id: '16', titel: 'Verjaardag Tim',    datum: '2026-06-18', beginTijd: '00:00', eindTijd: '23:59', heeldag: true,  labelIds: ['persoonlijk'] },
  { id: '17', titel: 'Doktersafspraak',   datum: '2026-06-22', beginTijd: '11:00', eindTijd: '11:30', heeldag: false, labelIds: ['persoonlijk'] },
  { id: '18', titel: 'Teamuitje',         datum: '2026-06-25', beginTijd: '12:00', eindTijd: '18:00', heeldag: false, labelIds: ['werk'] },
]
