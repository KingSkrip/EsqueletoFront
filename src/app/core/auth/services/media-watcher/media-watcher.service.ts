
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { Observable, ReplaySubject, map, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MediaWatcherService {
    private _breakpointObserver = inject(BreakpointObserver);

    private _onMediaChange = new ReplaySubject<{
        matchingAliases: string[];
        matchingQueries: Record<string, string>;
    }>(1);

    constructor() {
        // Aquí después podemos sustituir AppConfigService
        // por nuestra propia configuración de breakpoints.
    }

    get onMediaChange$(): Observable<{
        matchingAliases: string[];
        matchingQueries: Record<string, string>;
    }> {
        return this._onMediaChange.asObservable();
    }

    onMediaQueryChange$(
        query: string | string[]
    ): Observable<BreakpointState> {
        return this._breakpointObserver.observe(query);
    }
}
