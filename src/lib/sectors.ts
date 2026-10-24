/* Sector categories (in Portuguese) for B3 and US stocks, mapped from the data provider's industry. */

const MAP: Record<string, string> = {
  'Major Banks': 'Bancos', 'Regional Banks': 'Bancos', 'Savings Banks': 'Bancos',
  'Investment Banks/Brokers': 'Corretoras e investimentos', 'Investment Managers': 'Corretoras e investimentos', 'Investment Trusts/Mutual Funds': 'Corretoras e investimentos', 'Financial Conglomerates': 'Serviços financeiros', 'Finance/Rental/Leasing': 'Serviços financeiros', 'Financial Publishing/Services': 'Serviços financeiros',
  'Life/Health Insurance': 'Seguros', 'Multi-Line Insurance': 'Seguros', 'Property/Casualty Insurance': 'Seguros', 'Specialty Insurance': 'Seguros', 'Insurance Brokers/Services': 'Seguros',
  'Electric Utilities': 'Energia elétrica', 'Alternative Power Generation': 'Energia renovável',
  'Water Utilities': 'Saneamento', 'Gas Distributors': 'Gás',
  'Integrated Oil': 'Petróleo e gás', 'Oil & Gas Production': 'Petróleo e gás', 'Oil Refining/Marketing': 'Petróleo e gás', 'Oil & Gas Pipelines': 'Petróleo e gás', 'Oilfield Services/Equipment': 'Petróleo e gás', 'Contract Drilling': 'Petróleo e gás', 'Coal': 'Mineração',
  'Other Metals/Minerals': 'Mineração', 'Precious Metals': 'Mineração', 'Aluminum': 'Siderurgia e metalurgia', 'Steel': 'Siderurgia e metalurgia', 'Metal Fabrication': 'Siderurgia e metalurgia',
  'Pulp & Paper': 'Papel e celulose', 'Forest Products': 'Papel e celulose', 'Containers/Packaging': 'Embalagens',
  'Chemicals: Agricultural': 'Químicos e fertilizantes', 'Chemicals: Major Diversified': 'Químicos e fertilizantes', 'Chemicals: Specialty': 'Químicos e fertilizantes',
  'Agricultural Commodities/Milling': 'Agronegócio',
  'Food: Major Diversified': 'Alimentos', 'Food: Meat/Fish/Dairy': 'Alimentos', 'Food: Specialty/Candy': 'Alimentos', 'Food Distributors': 'Alimentos',
  'Beverages: Alcoholic': 'Bebidas', 'Beverages: Non-Alcoholic': 'Bebidas', 'Tobacco': 'Bebidas e tabaco',
  'Food Retail': 'Varejo', 'Department Stores': 'Varejo', 'Discount Stores': 'Varejo', 'Specialty Stores': 'Varejo', 'Apparel/Footwear Retail': 'Varejo', 'Electronics/Appliance Stores': 'Varejo', 'Home Improvement Chains': 'Varejo', 'Internet Retail': 'Varejo e e-commerce', 'Wholesale Distributors': 'Distribuição', 'Electronics Distributors': 'Distribuição', 'Medical Distributors': 'Saúde',
  'Drugstore Chains': 'Farmácias',
  'Apparel/Footwear': 'Vestuário e calçados', 'Textiles': 'Vestuário e calçados',
  'Household/Personal Care': 'Higiene e beleza', 'Consumer Sundries': 'Consumo', 'Home Furnishings': 'Casa e decoração', 'Electronics/Appliances': 'Eletrodomésticos', 'Recreational Products': 'Lazer', 'Other Consumer Specialties': 'Consumo', 'Other Consumer Services': 'Serviços ao consumidor',
  'Hotels/Resorts/Cruise lines': 'Turismo e lazer', 'Restaurants': 'Restaurantes', 'Casinos/Gaming': 'Turismo e lazer', 'Movies/Entertainment': 'Mídia e entretenimento',
  'Airlines': 'Aviação', 'Aerospace & Defense': 'Aeroespacial e defesa',
  'Railroads': 'Transporte e logística', 'Trucking': 'Transporte e logística', 'Marine Shipping': 'Transporte e logística', 'Air Freight/Couriers': 'Transporte e logística', 'Other Transportation': 'Transporte e logística',
  'Motor Vehicles': 'Automotivo', 'Auto Parts: OEM': 'Automotivo', 'Automotive Aftermarket': 'Automotivo', 'Trucks/Construction/Farm Machinery': 'Máquinas e equipamentos', 'Industrial Machinery': 'Máquinas e equipamentos', 'Electrical Products': 'Máquinas e equipamentos', 'Tools & Hardware': 'Máquinas e equipamentos', 'Industrial Conglomerates': 'Indústria', 'Industrial Specialties': 'Indústria', 'Miscellaneous Manufacturing': 'Indústria', 'Office Equipment/Supplies': 'Indústria',
  'Homebuilding': 'Construção civil', 'Engineering & Construction': 'Construção civil', 'Building Products': 'Construção civil', 'Construction Materials': 'Construção civil',
  'Real Estate Development': 'Imobiliário', 'Real Estate Investment Trusts': 'Imobiliário',
  'Hospital/Nursing Management': 'Saúde', 'Medical/Nursing Services': 'Saúde', 'Managed Health Care': 'Saúde', 'Medical Specialties': 'Saúde', 'Services to the Health Industry': 'Saúde',
  'Pharmaceuticals: Major': 'Farmacêutico', 'Pharmaceuticals: Other': 'Farmacêutico', 'Biotechnology': 'Biotecnologia',
  'Semiconductors': 'Semicondutores', 'Electronic Production Equipment': 'Semicondutores', 'Electronic Components': 'Hardware e eletrônicos', 'Electronic Equipment/Instruments': 'Hardware e eletrônicos', 'Computer Processing Hardware': 'Hardware e eletrônicos', 'Computer Peripherals': 'Hardware e eletrônicos', 'Computer Communications': 'Hardware e eletrônicos', 'Telecommunications Equipment': 'Hardware e eletrônicos',
  'Packaged Software': 'Software', 'Internet Software/Services': 'Internet', 'Information Technology Services': 'Serviços de TI', 'Data Processing Services': 'Serviços de TI',
  'Major Telecommunications': 'Telecomunicações', 'Wireless Telecommunications': 'Telecomunicações', 'Specialty Telecommunications': 'Telecomunicações', 'Cable/Satellite TV': 'Telecomunicações',
  'Broadcasting': 'Mídia e entretenimento', 'Media Conglomerates': 'Mídia e entretenimento', 'Publishing: Books/Magazines': 'Mídia e entretenimento', 'Publishing: Newspapers': 'Mídia e entretenimento', 'Advertising/Marketing Services': 'Mídia e entretenimento',
  'Environmental Services': 'Serviços ambientais', 'Personnel Services': 'Serviços', 'Miscellaneous Commercial Services': 'Serviços', 'Commercial Printing/Forms': 'Serviços',
}
// a few Brazilian specifics the industry codes don't separate
const B3_TICKER: Record<string, string> = { YDUQ: 'Educação', COGN: 'Educação', ANIM: 'Educação', SEER: 'Educação', CSED: 'Educação', VTRU: 'Educação', BHIA: 'Varejo', CVCB: 'Turismo e lazer', AZUL: 'Aviação', GOLL: 'Aviação', EMBR: 'Aeroespacial e defesa', EMBJ: 'Aeroespacial e defesa', SBSP: 'Saneamento', SAPR: 'Saneamento', CSMG: 'Saneamento', ORVR: 'Saneamento', AMBP: 'Serviços ambientais', CGAS: 'Gás', SMTO: 'Agronegócio', SLCE: 'Agronegócio', AGRO: 'Agronegócio', TTEN: 'Agronegócio', SOJA: 'Agronegócio', JALL: 'Agronegócio', RAIZ: 'Agronegócio' }

export function categoryOf(industry: string | null | undefined, ticker?: string): string | null {
  const t = ticker?.slice(0, 4)
  if (t && B3_TICKER[t]) return B3_TICKER[t]
  if (!industry) return null
  return MAP[industry] ?? 'Outros'
}
