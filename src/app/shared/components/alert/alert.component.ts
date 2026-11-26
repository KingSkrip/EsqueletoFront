
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

export type AlertAppearance = 'border' | 'fill' | 'outline' | 'soft';

export type AlertType =
    | 'primary'
    | 'accent'
    | 'basic'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

@Component({
    selector: 'app-alert',
    standalone: true,
    templateUrl: './alert.component.html',
    styleUrl: './alert.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
    @Input() type: AlertType = 'info';
    @Input() appearance: AlertAppearance = 'soft';
    @Input() title = '';
    @Input() message = '';
    @Input() showIcon = true;
    @Input() dismissible = false;
    @Input() dismissed = false;

    @Output() dismissedChange = new EventEmitter<boolean>();

    get icon(): string {
        const icons: Record<AlertType, string> = {
            primary: 'check-circle',
            accent: 'check-circle',
            basic: 'check-circle',
            info: 'info',
            success: 'check-circle',
            warning: 'alert-triangle',
            error: 'x-circle',
        };

        return icons[this.type];
    }

    dismiss(): void {
        if (!this.dismissible || this.dismissed) {
            return;
        }

        this.dismissed = true;
        this.dismissedChange.emit(true);
    }

    show(): void {
        if (!this.dismissed) {
            return;
        }

        this.dismissed = false;
        this.dismissedChange.emit(false);
    }
}
