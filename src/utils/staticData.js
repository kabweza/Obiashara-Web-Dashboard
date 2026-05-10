// src/utils/staticData.js

export const BUSINESS_TYPES = [
  { id: 1, code: 'retail', nameEn: 'Retail Shop', nameSw: 'Duka la Rejareja' },
  { id: 2, code: 'wholesale', nameEn: 'Wholesale', nameSw: 'Biashara ya Jumla' },
  { id: 3, code: 'food', nameEn: 'Food & Restaurant', nameSw: 'Chakula na Mkahawa' },
  { id: 4, code: 'electronics', nameEn: 'Electronics', nameSw: 'Vifaa vya Umeme' },
  { id: 5, code: 'clothing', nameEn: 'Clothing & Fashion', nameSw: 'Nguo na Mavazi' },
  { id: 6, code: 'pharmacy', nameEn: 'Pharmacy', nameSw: 'Duka la Dawa' },
  { id: 7, code: 'salon', nameEn: 'Salon & Beauty', nameSw: 'Saluni na Urembo' },
  { id: 8, code: 'hardware', nameEn: 'Hardware & Building', nameSw: 'Vifaa vya Ujenzi' },
  { id: 9, code: 'agriculture', nameEn: 'Agriculture', nameSw: 'Kilimo' },
  { id: 10, code: 'transport', nameEn: 'Transport & Logistics', nameSw: 'Usafirishaji' },
  { id: 11, code: 'service', nameEn: 'General Services', nameSw: 'Huduma za Jumla' },
  { id: 12, code: 'other', nameEn: 'Other', nameSw: 'Nyingine' },
]

export const TANZANIA_REGIONS = [
  {
    id: 1, name: 'Dar es Salaam',
    districts: [
      { id: 11, name: 'Ilala', wards: [{ id: 111, name: 'Kariakoo' }, { id: 112, name: 'Kisutu' }, { id: 113, name: 'Mchafukoge' }, { id: 114, name: 'Gerezani' }] },
      { id: 12, name: 'Kinondoni', wards: [{ id: 121, name: 'Kinondoni' }, { id: 122, name: 'Magomeni' }, { id: 123, name: 'Msasani' }, { id: 124, name: 'Mwananyamala' }] },
      { id: 13, name: 'Temeke', wards: [{ id: 131, name: 'Temeke' }, { id: 132, name: 'Mbagala' }, { id: 133, name: 'Kurasini' }, { id: 134, name: 'Chang\'ombe' }] },
      { id: 14, name: 'Ubungo', wards: [{ id: 141, name: 'Ubungo' }, { id: 142, name: 'Kimara' }, { id: 143, name: 'Sinza' }] },
      { id: 15, name: 'Kigamboni', wards: [{ id: 151, name: 'Kigamboni' }, { id: 152, name: 'Mjimwema' }] },
    ]
  },
  {
    id: 2, name: 'Arusha',
    districts: [
      { id: 21, name: 'Arusha City', wards: [{ id: 211, name: 'Elerai' }, { id: 212, name: 'Daraja Mbili' }, { id: 213, name: 'Kaloleni' }] },
      { id: 22, name: 'Meru', wards: [{ id: 221, name: 'Usa River' }, { id: 222, name: 'Tengeru' }] },
    ]
  },
  {
    id: 3, name: 'Mwanza',
    districts: [
      { id: 31, name: 'Nyamagana', wards: [{ id: 311, name: 'Butimba' }, { id: 312, name: 'Igoma' }, { id: 313, name: 'Isamilo' }] },
      { id: 32, name: 'Ilemela', wards: [{ id: 321, name: 'Ilemela' }, { id: 322, name: 'Bugando' }] },
    ]
  },
  {
    id: 4, name: 'Dodoma',
    districts: [
      { id: 41, name: 'Dodoma City', wards: [{ id: 411, name: 'Makole' }, { id: 412, name: 'Ipagala' }, { id: 413, name: 'Chamwino' }] },
    ]
  },
  {
    id: 5, name: 'Tanga',
    districts: [
      { id: 51, name: 'Tanga City', wards: [{ id: 511, name: 'Nguvumali' }, { id: 512, name: 'Makorora' }] },
    ]
  },
  {
    id: 6, name: 'Morogoro',
    districts: [
      { id: 61, name: 'Morogoro Municipal', wards: [{ id: 611, name: 'Mji Mpya' }, { id: 612, name: 'Bonde la Mpunga' }] },
    ]
  },
  {
    id: 7, name: 'Mbeya',
    districts: [
      { id: 71, name: 'Mbeya City', wards: [{ id: 711, name: 'Uyole' }, { id: 712, name: 'Mwanjelwa' }] },
    ]
  },
  {
    id: 8, name: 'Zanzibar Urban/West',
    districts: [
      { id: 81, name: 'Mjini', wards: [{ id: 811, name: 'Stone Town' }, { id: 812, name: 'Ng\'ambo' }] },
    ]
  },
]
