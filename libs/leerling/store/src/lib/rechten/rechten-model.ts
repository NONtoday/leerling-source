import { RAccount, REloRestricties } from 'leerling-codegen';
import { AccountContextMetRechten } from './rechten-selectors';

export interface SRechtenModel {
    accounts: SAccountRechtenModel[];
    isVerzorger: boolean;
}
export interface SAccountRechtenModel {
    localAuthenticationContext: string;
    leerlingen: SRechten[];
}

export type SRechten = REloRestricties;

export function mapAccountRechtenModel(account: RAccount, localAccountContext: string): SAccountRechtenModel {
    const leerlingenRechten: SRechten[] =
        account?.additionalObjects?.['restricties']?.items
            .filter((rechten: REloRestricties) => rechten.leerlingId !== 0)
            .map((rechten: REloRestricties) => mapRechten(rechten)) ?? [];

    return {
        localAuthenticationContext: localAccountContext,
        leerlingen: leerlingenRechten
    } as SAccountRechtenModel;
}

export function mapRechten(rechten: REloRestricties): SRechten {
    return {
        leerlingId: rechten.leerlingId ?? undefined,
        mobieleAppAan: rechten.mobieleAppAan ?? false,
        studiewijzerAan: rechten.studiewijzerAan ?? false,
        berichtenVerzendenAan: rechten.berichtenVerzendenAan ?? false,
        leermiddelenAan: rechten.leermiddelenAan ?? false,
        adviezenTokenAan: rechten.adviezenTokenAan ?? false,
        opmerkingRapportCijferTonenAan: rechten.opmerkingRapportCijferTonenAan ?? false,
        periodeGemiddeldeTonenResultaatAan: rechten.periodeGemiddeldeTonenResultaatAan ?? false,
        rapportGemiddeldeTonenResultaatAan: rechten.rapportGemiddeldeTonenResultaatAan ?? false,
        rapportCijferTonenResultaatAan: rechten.rapportCijferTonenResultaatAan ?? false,
        toetssoortgemiddeldenAan: rechten.toetssoortgemiddeldenAan ?? false,
        seResultaatAan: rechten.seResultaatAan ?? false,
        stamgroepLeerjaarAan: rechten.stamgroepLeerjaarAan ?? false,
        emailWijzigenAan: rechten.emailWijzigenAan ?? false,
        mobielWijzigenAan: rechten.mobielWijzigenAan ?? false,
        wachtwoordWijzigenAan: rechten.wachtwoordWijzigenAan ?? false,
        absentiesBekijkenAan: rechten.absentiesBekijkenAan ?? false,
        absentieConstateringBekijkenAan: rechten.absentieConstateringBekijkenAan ?? false,
        absentieMaatregelBekijkenAan: rechten.absentieMaatregelBekijkenAan ?? false,
        absentieMeldingBekijkenAan: rechten.absentieMeldingBekijkenAan ?? false,
        berichtenBekijkenAan: rechten.berichtenBekijkenAan ?? false,
        cijfersBekijkenAan: rechten.cijfersBekijkenAan ?? false,
        huiswerkBekijkenAan: rechten.huiswerkBekijkenAan ?? false,
        huiswerkWelNietInOrdeTonenAan: rechten.huiswerkWelNietInOrdeTonenAan ?? false,
        nieuwsBekijkenAan: rechten.nieuwsBekijkenAan ?? false,
        pasfotoLeerlingTonenAan: rechten.pasfotoLeerlingTonenAan ?? false,
        pasfotoMedewerkerTonenAan: rechten.pasfotoMedewerkerTonenAan ?? false,
        profielBekijkenAan: rechten.profielBekijkenAan ?? false,
        roosterBekijkenAan: rechten.roosterBekijkenAan ?? false,
        roosterBeschikbaarIcalAan: rechten.roosterBeschikbaarIcalAan ?? false,
        vakkenBekijkenAan: rechten.vakkenBekijkenAan ?? false,
        lesurenVerbergenSettingAan: rechten.lesurenVerbergenSettingAan ?? false
    };
}

export const verifyRegistratiesRechten = (accountContext: AccountContextMetRechten): boolean => {
    if (accountContext.currentAccountIsVerzorger) {
        return false;
    }
    const rechten = accountContext.rechten;

    return (
        !!rechten.huiswerkWelNietInOrdeTonenAan ||
        (!!rechten.absentiesBekijkenAan && !!rechten.absentieConstateringBekijkenAan && !!rechten.absentieMeldingBekijkenAan)
    );
};

export const verifyMaatregelRechten = (rechten: REloRestricties): boolean =>
    !!rechten.absentiesBekijkenAan && !!rechten.absentieMaatregelBekijkenAan;

/**
 * Registraties zijn momenteel alleen beschikbaar voor leerlingaccounts.
 * Absentieregistraties vereisen het algemene absenties recht, en daarnaast zowel constatering als melding- rechten aangezien dit een combinatie van beide gegevens betreft.
 * Voor de huiswerk- en materiaal niet in orde registratieblokjes is alleen het huiswerkrecht vereist.
 * Maatregelen zijn voor zowel ouders als leerlingaccounts beschikbaar, mits de rechten ervoor aanstaan.
 * Het registratieoverzicht in zijn geheel is beschikbaar indien minstens 1 van bovenstaande beschikbaar is.
 */
export const verifyRegistratieOverzichtRechten = (accountContext: AccountContextMetRechten): boolean =>
    verifyRegistratiesRechten(accountContext) || verifyMaatregelRechten(accountContext.rechten);
