export enum PublicationType {
  SERVICE_OFFER = 'SERVICE_OFFER',           // Persona ofreciendo servicio (YA EXISTE)
  SERVICE_REQUEST = 'SERVICE_REQUEST',       // Persona/Empresa necesitando servicio (NUEVO)
  COMPANY_SERVICE_OFFER = 'COMPANY_SERVICE_OFFER', // Empresa ofreciendo servicio (NUEVO)
  COMPANY_JOB_OFFER = 'COMPANY_JOB_OFFER',   // Empresa buscando empleado (YA EXISTE)
  INFORMAL_JOB_OFFER = 'INFORMAL_JOB_OFFER'  // Oferta de trabajo informal (NUEVO)
}

export const PUBLICATION_TYPE_LABELS = {
  [PublicationType.SERVICE_OFFER]: 'Ofrezco mi servicio',
  [PublicationType.SERVICE_REQUEST]: 'Necesito un servicio',
  [PublicationType.COMPANY_SERVICE_OFFER]: 'Empresa ofreciendo servicio',
  [PublicationType.COMPANY_JOB_OFFER]: 'Empresa buscando empleado',
  [PublicationType.INFORMAL_JOB_OFFER]: 'Oferta de trabajo informal'
};

export const PUBLICATION_TYPE_DESCRIPTIONS = {
  [PublicationType.SERVICE_OFFER]: 'Publica los servicios que ofreces como profesional independiente',
  [PublicationType.SERVICE_REQUEST]: 'Busca profesionales que te ayuden con tus necesidades',
  [PublicationType.COMPANY_SERVICE_OFFER]: 'Tu empresa ofrece servicios especializados',
  [PublicationType.COMPANY_JOB_OFFER]: 'Tu empresa busca nuevos talentos para unirse al equipo',
  [PublicationType.INFORMAL_JOB_OFFER]: 'Oferta de trabajo por prestación de servicios por tiempo corto'
};

// Tipos disponibles por rol de usuario
export const PUBLICATION_TYPES_BY_ROLE = {
  PERSON: [
    PublicationType.SERVICE_OFFER,
    PublicationType.SERVICE_REQUEST,
    PublicationType.INFORMAL_JOB_OFFER
  ],
  BUSINESS: [
    PublicationType.SERVICE_REQUEST,
    PublicationType.COMPANY_SERVICE_OFFER,
    PublicationType.COMPANY_JOB_OFFER,
    PublicationType.INFORMAL_JOB_OFFER
  ],
  ADMIN: Object.values(PublicationType)
}; 