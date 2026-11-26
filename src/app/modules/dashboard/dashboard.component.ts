import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {

    /**
     * Información general de la vista.
     */
    readonly pageTitle = 'Dashboard';

    readonly pageDescription =
        'Panel general de operaciones de VIGIX';

}