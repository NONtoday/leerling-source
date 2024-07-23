import { createSelector } from '@ngxs/store';
import { SStudiemateriaal, SStudiemateriaalModel } from './studiemateriaal-model';
import { StudiemateriaalState } from './studiemateriaal-state';

export class StudiemateriaalSelectors {
    public static getStudiemateriaal(vakOfLesgroepUuid: string) {
        return createSelector([StudiemateriaalState], (state: SStudiemateriaalModel) => {
            if (!vakOfLesgroepUuid) return undefined;
            return state.studiemateriaal?.find((studiemateriaal) => studiemateriaal.vakOfLesgroepUuid === vakOfLesgroepUuid);
        });
    }

    public static getEduRoutePortalProducts() {
        return createSelector([StudiemateriaalState], (state: SStudiemateriaalModel) => {
            return state.eduRoutePortalProducts;
        });
    }

    public static getLesstof(vakOfLesgroepUuid: string) {
        return createSelector([this.getStudiemateriaal(vakOfLesgroepUuid)], (studiemateriaal: SStudiemateriaal) => {
            return studiemateriaal?.lesstof;
        });
    }

    public static getJaarbijlagenMappen(vakOfLesgroepUuid: string) {
        return createSelector([this.getStudiemateriaal(vakOfLesgroepUuid)], (studiemateriaal: SStudiemateriaal) => {
            return studiemateriaal?.jaarbijlagenMappen;
        });
    }

    public static getJaarbijlagen(vakOfLesgroepUuid: string) {
        return createSelector([this.getStudiemateriaal(vakOfLesgroepUuid)], (studiemateriaal: SStudiemateriaal) => {
            return studiemateriaal?.jaarbijlagen;
        });
    }

    public static getExternMateriaal(vakOfLesgroepUuid: string) {
        return createSelector([this.getStudiemateriaal(vakOfLesgroepUuid)], (studiemateriaal: SStudiemateriaal) => {
            return studiemateriaal?.externMateriaal;
        });
    }

    public static getLeermiddelen(vakOfLesgroepUuid: string) {
        return createSelector([this.getStudiemateriaal(vakOfLesgroepUuid)], (studiemateriaal: SStudiemateriaal) => {
            return studiemateriaal?.leermiddelen;
        });
    }

    public static getVakkenMetStudiemateriaal() {
        return createSelector([StudiemateriaalState], (state: SStudiemateriaalModel) => {
            return state.vakkenMetStudiemateriaal;
        });
    }
}
