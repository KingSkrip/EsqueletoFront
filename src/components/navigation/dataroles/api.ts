import { Injectable } from '@angular/core';
import { NavigationItem } from '../navigation.types';
import { compactNavigation, defaultNavigation, futuristicNavigation, horizontalNavigation } from './data';
import { AppMockApiService } from '../../lib/mock-api';

@Injectable({ providedIn: 'root' })
export class NavigationMockApi {
    private readonly _compactNavigation: NavigationItem[] =
        compactNavigation;
    private readonly _defaultNavigation: NavigationItem[] =
        defaultNavigation;
    private readonly _futuristicNavigation: NavigationItem[] =
        futuristicNavigation;
    private readonly _horizontalNavigation: NavigationItem[] =
        horizontalNavigation;

    /**
     * Constructor
     */
    constructor(private _appMockApiService: AppMockApiService) {
        // Register Mock API handlers
        this.registerHandlers();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {
        // -----------------------------------------------------------------------------------------------------
        // @ Navigation - GET
        // -----------------------------------------------------------------------------------------------------
        this._appMockApiService.onGet('api/common/navigation').reply(() => {
            // Fill compact navigation children using the default navigation
            this._compactNavigation.forEach((compactNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === compactNavItem.id) {
                        compactNavItem.children = structuredClone(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // Fill futuristic navigation children using the default navigation
            this._futuristicNavigation.forEach((futuristicNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === futuristicNavItem.id) {
                        futuristicNavItem.children = structuredClone(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // Fill horizontal navigation children using the default navigation
            this._horizontalNavigation.forEach((horizontalNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === horizontalNavItem.id) {
                        horizontalNavItem.children = structuredClone(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // Return the response
            return [
                200,
                {
                    compact: structuredClone(this._compactNavigation),
                    default: structuredClone(this._defaultNavigation),
                    futuristic: structuredClone(this._futuristicNavigation),
                    horizontal: structuredClone(this._horizontalNavigation),
                },
            ];
        });
    }
}