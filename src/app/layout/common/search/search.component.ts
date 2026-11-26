import { Overlay } from '@angular/cdk/overlay';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormControl,
} from '@angular/forms';
import {
    MAT_AUTOCOMPLETE_SCROLL_STRATEGY,
    MatAutocomplete,
    MatAutocompleteModule,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { Subject, debounceTime, filter, map, takeUntil } from 'rxjs';
import { appAnimations } from '../../../../components/animations';

@Component({
    selector: 'search',
    templateUrl: './search.component.html',
    encapsulation: ViewEncapsulation.None,
    exportAs: 'appSearch', // ← antes: fuseSearch
    animations: appAnimations,
    imports: [
        MatButtonModule,
        MatIconModule,
        FormsModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
        MatOptionModule,
        RouterLink,
        NgTemplateOutlet,
        MatFormFieldModule,
        MatInputModule,
        NgClass,
    ],
    providers: [
        {
            provide: MAT_AUTOCOMPLETE_SCROLL_STRATEGY,
            useFactory: () => {
                const overlay = inject(Overlay);
                return () => overlay.scrollStrategies.block();
            },
        },
    ],
})
export class SearchComponent implements OnChanges, OnInit, OnDestroy {
    @Input() appearance: 'basic' | 'bar' = 'basic';
    @Input() debounce = 300;
    @Input() minLength = 2;
    @Output() search = new EventEmitter<any>();

    opened = false;
    resultSets: any[] | null = null;
    searchControl = new UntypedFormControl();

    private _matAutocomplete?: MatAutocomplete;
    private _unsubscribeAll = new Subject<void>();

    constructor(private _httpClient: HttpClient) {}

    // -------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------

    @HostBinding('class') get classList(): Record<string, boolean> {
        return {
            'search-appearance-bar': this.appearance === 'bar',
            'search-appearance-basic': this.appearance === 'basic',
            'search-opened': this.opened,
        };
    }

    @ViewChild('barSearchInput')
    set barSearchInput(value: ElementRef<HTMLInputElement> | undefined) {
        // Si existe, el input ya está en el DOM y podemos enfocarlo
        if (value) {
            setTimeout(() => value.nativeElement.focus());
        }
    }

    @ViewChild('matAutocomplete')
    set matAutocomplete(value: MatAutocomplete) {
        this._matAutocomplete = value;
    }

    // -------------------------------------------------------------------
    // Lifecycle hooks
    // -------------------------------------------------------------------

    ngOnChanges(changes: SimpleChanges): void {
        if ('appearance' in changes) {
            // Cierra la búsqueda al cambiar el appearance
            this.close();
        }
    }

    ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(
                debounceTime(this.debounce),
                takeUntil(this._unsubscribeAll),
                map((value: string | null) => {
                    // Sin valor o menor al mínimo: null cierra el panel del autocomplete
                    if (!value || value.length < this.minLength) {
                        this.resultSets = null;
                    }
                    return value;
                }),
                filter((value): value is string => !!value && value.length >= this.minLength),
            )
            .subscribe((value) => {
                this._httpClient
                    .post<any[]>('api/common/search', { query: value })
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe((resultSets) => {
                        this.resultSets = resultSets;
                        this.search.emit(resultSets);
                    });
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    onKeydown(event: KeyboardEvent): void {
        if (event.code === 'Escape') {
            // En 'bar', si el autocomplete no está abierto, cierra la búsqueda
            if (this.appearance === 'bar' && !this._matAutocomplete?.isOpen) {
                this.close();
            }
        }
    }

    open(): void {
        if (this.opened) return;
        this.opened = true;
    }

    close(): void {
        if (!this.opened) return;
        this.searchControl.setValue('');
        this.opened = false;
    }

    trackByFn(index: number, item: { id?: string | number }): string | number {
        return item.id || index;
    }
}