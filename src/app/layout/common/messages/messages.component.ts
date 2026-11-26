import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Message } from './messages.types';
import { MessagesService } from './messages.service';

@Component({
    selector: 'messages',
    templateUrl: './messages.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'messages',
    imports: [
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        NgClass,
        NgTemplateOutlet,
        RouterLink,
        DatePipe,
    ],
})
export class MessagesComponent implements OnInit, OnDestroy {
    @ViewChild('messagesOrigin') private _messagesOrigin!: MatButton;
    @ViewChild('messagesPanel') private _messagesPanel!: TemplateRef<any>;

    messages: Message[] = [];
    unreadCount = 0;

    private _overlayRef: OverlayRef | null = null;
    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _messagesService: MessagesService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
    ) {}

    // -------------------------------------------------------------------
    // Lifecycle hooks
    // -------------------------------------------------------------------

    ngOnInit(): void {
        this._messagesService.messages$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((messages) => {
                this.messages = messages ?? [];
                this._calculateUnreadCount();
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._overlayRef?.dispose();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    openPanel(): void {
        if (!this._messagesPanel || !this._messagesOrigin) {
            return;
        }

        if (!this._overlayRef) {
            this._overlayRef = this._createOverlay();
        }

        this._overlayRef.attach(
            new TemplatePortal(this._messagesPanel, this._viewContainerRef),
        );
    }

    closePanel(): void {
        this._overlayRef?.detach();
    }

    markAllAsRead(): void {
        this._messagesService.markAllAsRead().subscribe();
    }

    toggleRead(message: Message): void {
        // Copia en vez de mutar (compatible con OnPush)
        const updated: Message = { ...message, read: !message.read };

        this._messagesService.update(message.id, updated).subscribe();
    }

    delete(message: Message): void {
        this._messagesService.delete(message.id).subscribe();
    }

    trackByFn(index: number, item: Message): string | number {
        return item.id || index;
    }

    // -------------------------------------------------------------------
    // Private methods
    // -------------------------------------------------------------------

    private _createOverlay(): OverlayRef {
        const overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'app-backdrop-on-mobile', // ← antes: fuse-backdrop-on-mobile
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay
                .position()
                .flexibleConnectedTo(this._messagesOrigin._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
                    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
                    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
                ]),
        });

        overlayRef.backdropClick().subscribe(() => overlayRef.detach());

        return overlayRef;
    }

    private _calculateUnreadCount(): void {
        this.unreadCount = this.messages.filter((m) => !m.read).length;
    }
}