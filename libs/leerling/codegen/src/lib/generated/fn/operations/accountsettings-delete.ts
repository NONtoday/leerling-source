/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface AccountsettingsDelete$Params {
}

export function accountsettingsDelete(http: HttpClient, rootUrl: string, params?: AccountsettingsDelete$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: any;
}>> {
  const rb = new RequestBuilder(rootUrl, accountsettingsDelete.PATH, 'delete');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      [key: string]: any;
      }>;
    })
  );
}

accountsettingsDelete.PATH = '/accountsettings';
