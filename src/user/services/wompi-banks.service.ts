import { Injectable, Logger } from "@nestjs/common";

export interface WompiBankResponse {
  id: string;
  name: string;
  code: string;
}

@Injectable()
export class WompiBanksService {
  private readonly logger = new Logger(WompiBanksService.name);

  async getBanks(): Promise<WompiBankResponse[]> {
    this.logger.log("Devolviendo lista de bancos hardcodeada");
    return this.getBanksHardcoded();
  }

  private getBanksHardcoded(): WompiBankResponse[] {
    this.logger.log("Usando lista oficial de bancos colombianos");
    
    return [
      { id: "001", name: "BANCO DE BOGOTA", code: "1001" },
      { id: "002", name: "BANCO POPULAR", code: "1002" },
      { id: "003", name: "ITAU antes Corpbanca", code: "1006" },
      { id: "004", name: "BANCOLOMBIA", code: "1007" },
      { id: "005", name: "CITIBANK", code: "1009" },
      { id: "006", name: "BANCO GNB SUDAMERIS", code: "1012" },
      { id: "007", name: "BBVA COLOMBIA", code: "1013" },
      { id: "008", name: "ITAU", code: "1014" },
      { id: "009", name: "SCOTIABANK COLPATRIA S.A", code: "1019" },
      { id: "010", name: "BANCO DE OCCIDENTE", code: "1023" },
      { id: "011", name: "BANCOLDEX S.A.", code: "1031" },
      { id: "012", name: "BANCO CAJA SOCIAL BCSC SA", code: "1032" },
      { id: "013", name: "BANCO AGRARIO", code: "1040" },
      { id: "014", name: "BANCO MUNDO MUJER", code: "1047" },
      { id: "015", name: "BANCO DAVIVIENDA SA", code: "1051" },
      { id: "016", name: "BANCO AV VILLAS", code: "1052" },
      { id: "017", name: "BANCO W S.A", code: "1053" },
      { id: "018", name: "BANCAMIA S.A", code: "1059" },
      { id: "019", name: "BANCO PICHINCHA", code: "1060" },
      { id: "020", name: "BANCOOMEVA", code: "1061" },
      { id: "021", name: "BANCO FALABELLA S.A.", code: "1062" },
      { id: "022", name: "BANCO FINANDINA S.A.", code: "1063" },
      { id: "023", name: "BANCO SANTANDER DE NEGOCIOS CO", code: "1065" },
      { id: "024", name: "BANCO COOPERATIVO COOPCENTRAL", code: "1066" },
      { id: "025", name: "MIBANCO S.A.", code: "1067" },
      { id: "026", name: "BANCO SERFINANZA S.A", code: "1069" },
      { id: "027", name: "LULO BANK S.A.", code: "1070" },
      { id: "028", name: "BANCO J.P. MORGAN COLOMBIA S.A", code: "1071" },
      { id: "029", name: "FINANCIERA JURISCOOP S.A. COMP", code: "1121" },
      { id: "030", name: "COOPERATIVA FINANCIERA DE ANTI", code: "1283" },
      { id: "031", name: "JFK COOPERATIVA FINANCIERA", code: "1286" },
      { id: "032", name: "COOTRAFA COOPERATIVA FINANCIER", code: "1289" },
      { id: "033", name: "CONFIAR COOPERATIVA FINANCIERA", code: "1292" },
      { id: "034", name: "BANCO UNION S.A", code: "1303" },
      { id: "035", name: "COLTEFINANCIERA S.A", code: "1370" },
      { id: "036", name: "NEQUI", code: "1507" },
      { id: "037", name: "DAVIPLATA", code: "1551" },
      { id: "038", name: "BANCO CREDIFINANCIERA SA.", code: "1558" },
      { id: "039", name: "PIBANK", code: "1560" },
      { id: "040", name: "IRIS", code: "1637" },
      { id: "041", name: "MOVII", code: "1801" },
      { id: "042", name: "DING TECNIPAGOS SA", code: "1802" },
      { id: "043", name: "POWWI", code: "1803" },
      { id: "044", name: "Ualá", code: "1804" },
      { id: "045", name: "BANCO BTG PACTUAL", code: "1805" },
      { id: "046", name: "BOLD CF", code: "1808" },
      { id: "047", name: "NU", code: "1809" },
      { id: "048", name: "RAPPIPAY", code: "1811" },
      { id: "049", name: "COINK", code: "1812" },
      { id: "050", name: "GLOBAL66", code: "1814" },
      { id: "051", name: "BANCO CONTACTAR S.A.", code: "1819" },
    ];
  }
}
