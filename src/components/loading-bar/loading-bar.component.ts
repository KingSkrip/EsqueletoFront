
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
    Component,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';

import { LoadingService } from '../../app/core/auth/services/loanding/loading.service';

@Component({
    selector: 'app-loading-bar',
    standalone: true,
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'loadingBar',
    imports: [MatProgressBarModule],
})
export class LoadingBarComponent implements OnChanges, OnInit, OnDestroy {
    private _loadingService = inject(LoadingService);

    @Input() autoMode = true;

    mode: 'determinate' | 'indeterminate' = 'indeterminate';
    progress = 0;
    show = false;

    private _unsubscribeAll = new Subject<void>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['autoMode']) {
            this._loadingService.setAutoMode(
                coerceBooleanProperty(changes['autoMode'].currentValue)
            );
        }
    }

    ngOnInit(): void {
        this._loadingService.mode$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.mode = value;
            });

        this._loadingService.progress$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.progress = value;
            });

        this._loadingService.show$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.show = value;
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
