import { HttpStatusCode } from '@angular/common/http';
import { RequestInformation } from './request-modals';

export class RequestInformationBuilder {
    private _queryParameters: { [key: string]: any } = {};
    private _headers: { [key: string]: string } = {};
    private _body: any;
    private _ignoreStatusCodes?: HttpStatusCode[];
    private _skipErrorMessageStatusCodes?: HttpStatusCode[];

    parameter(key: string, value: any): RequestInformationBuilder {
        if (this._queryParameters[key]) {
            if (Array.isArray(this._queryParameters[key])) {
                this._queryParameters[key].push(value);
            } else {
                this._queryParameters[key] = [this._queryParameters[key], value];
            }
        } else {
            this._queryParameters[key] = value;
        }
        return this;
    }

    header(key: string, value: string): RequestInformationBuilder {
        this._headers[key] = value;
        return this;
    }

    body(body: any): RequestInformationBuilder {
        this._body = body;
        return this;
    }

    ignoreStatusCodes(...ignoreStatusCodes: HttpStatusCode[]): RequestInformationBuilder {
        this._ignoreStatusCodes = ignoreStatusCodes;
        return this;
    }

    skipErrorMessageStatusCodes(...skipErrorMessageStatusCodes: HttpStatusCode[]): RequestInformationBuilder {
        this._skipErrorMessageStatusCodes = skipErrorMessageStatusCodes;
        return this;
    }

    additional(value: string): RequestInformationBuilder {
        return this.parameter('additional', value);
    }

    additionals(...values: string[]): RequestInformationBuilder {
        return this.parameter('additional', values);
    }

    leerling(value: string | number): RequestInformationBuilder {
        return this.parameter('leerling', value);
    }

    sortAsc(property: string): RequestInformationBuilder {
        return this.parameter('sort', 'asc-' + property);
    }

    sortDesc(property: string): RequestInformationBuilder {
        return this.parameter('sort', 'desc-' + property);
    }

    build(): RequestInformation {
        return {
            queryParameters: this._queryParameters,
            headers: this._headers,
            body: this._body,
            ignoreStatusCodes: this._ignoreStatusCodes,
            skipErrorMessageStatusCodes: this._skipErrorMessageStatusCodes,
            responseType: 'json'
        };
    }
}
