import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'sl-geen-agenda-gekoppeld',
    standalone: true,
    template: `
        <svg viewBox="0 0 274 295" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M264.385 163.597L257.161 159.427C248.815 154.608 245.888 144.124 250.606 135.952L258.8 121.759C263.519 113.587 260.591 103.103 252.245 98.285L225.89 83.068C217.544 78.25 214.616 67.766 219.334 59.594L230.122 40.908C234.841 32.7363 231.913 22.2527 223.567 17.4342L198.432 2.92228C190.086 -1.89622 179.543 0.810177 174.825 8.98228L164.037 27.6681C159.318 35.8401 148.775 38.5465 140.43 33.728L114.074 18.5116C105.728 13.6931 95.185 16.3995 90.467 24.5716L82.273 38.7651C77.554 46.937 67.012 49.644 58.666 44.825L51.442 40.655C43.096 35.8361 32.5535 38.5425 27.8353 46.715L2.3684 90.825C-2.3497 98.997 0.577993 109.48 8.92379 114.299L16.0496 118.413C24.3955 123.231 27.3231 133.715 22.605 141.887L13.1687 158.231C8.4506 166.403 11.3783 176.887 19.7241 181.705C28.07 186.524 30.9977 197.007 26.2796 205.179L15.7396 223.435C11.0215 231.607 13.9492 242.091 22.295 246.909L38.499 256.264C46.845 261.083 57.388 258.377 62.106 250.204L76.784 224.78C79.212 220.575 84.609 219.23 88.855 221.682C93.101 224.133 94.608 229.527 92.207 233.685L77.529 259.109C72.81 267.281 75.738 277.765 84.084 282.583L100.288 291.938C108.634 296.757 119.176 294.05 123.895 285.878L134.435 267.623C139.153 259.451 149.696 256.744 158.041 261.563C166.387 266.381 176.93 263.675 181.648 255.503L191.085 239.159C195.803 230.987 206.346 228.28 214.692 233.099L221.817 237.213C230.163 242.031 240.706 239.325 245.424 231.153L270.891 187.043C275.609 178.871 272.682 168.387 264.336 163.569L264.385 163.597Z"
                fill="var(--bg-neutral-weakest)"
                stroke="var(--border-neutral-weak)" />
            <path
                d="M231.555 55.913H37.4006C36.0199 55.913 34.9006 57.0323 34.9006 58.413V230.417C34.9006 231.798 36.0199 232.917 37.4006 232.917H231.555C232.935 232.917 234.055 231.798 234.055 230.417V58.413C234.055 57.0323 232.935 55.913 231.555 55.913Z"
                fill="var(--bg-neutral-none)"
                stroke="var(--border-neutral-weak)"
                stroke-width="5" />
            <rect
                x="38.9006"
                y="54.9134"
                width="199.154"
                height="177.004"
                rx="2.5"
                fill="var(--bg-elevated-none)"
                stroke="var(--fg-neutral-normal)"
                stroke-width="5" />
            <!-- calendar horizontal day seperators -->
            <line x1="39.4771" y1="76.1343" x2="236.452" y2="76.1343" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <line x1="39.4783" y1="114.694" x2="236.453" y2="114.694" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <line x1="39.4783" y1="153.769" x2="236.453" y2="153.769" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <line x1="40.5042" y1="192.843" x2="237.479" y2="192.843" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <!-- colorful days -->
            <rect opacity="0.75" x="90.7732" y="78.1201" width="44.1136" height="33.9329" fill="#296BD7" />
            <rect opacity="0.75" x="140.016" y="117.194" width="45.1395" height="33.9329" fill="#5B18EA" />
            <rect opacity="0.75" x="90.7732" y="156.269" width="45.1395" height="33.9329" fill="#E69B22" />
            <rect opacity="0.75" x="41.5301" y="195.343" width="44.1136" height="33.9329" fill="#B1270B" />
            <rect opacity="0.75" x="190.285" y="117.194" width="45.1395" height="33.9329" fill="#145716" />
            <!-- agenda dag items -->
            <ellipse cx="98.9803" cy="86.3463" rx="4.10359" ry="4.11307" fill="var(--bg-elevated-none)" />
            <ellipse cx="148.223" cy="125.42" rx="4.10359" ry="4.11307" fill="var(--bg-elevated-none)" />
            <ellipse cx="98.9803" cy="164.495" rx="4.10359" ry="4.11307" fill="var(--bg-elevated-none)" />
            <ellipse cx="49.7373" cy="203.569" rx="4.10359" ry="4.11307" fill="var(--bg-elevated-none)" />
            <ellipse cx="198.492" cy="125.42" rx="4.10359" ry="4.11307" fill="var(--bg-elevated-none)" />
            <rect x="94.8768" y="95.6007" width="35.9064" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="144.12" y="134.675" width="36.9323" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="94.8768" y="173.749" width="36.9323" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="45.6337" y="212.823" width="35.9064" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="194.389" y="134.675" width="36.9323" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="94.8768" y="102.799" width="12.3108" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="144.12" y="141.873" width="12.3108" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="94.8768" y="180.947" width="12.3108" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="45.6337" y="220.021" width="12.3108" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <rect x="194.389" y="141.873" width="12.3108" height="4.11307" rx="2.05654" fill="var(--bg-elevated-none)" />
            <!-- end agenda dag items -->
            <path d="M88.2084 43.159V61.6678" stroke="var(--fg-neutral-normal)" stroke-width="5" stroke-linecap="round" />
            <path d="M189.259 43.159V61.6678" stroke="var(--fg-neutral-normal)" stroke-width="5" stroke-linecap="round" />
            <line x1="88.2732" y1="229.276" x2="89.2991" y2="75.0327" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <line x1="137.516" y1="229.276" x2="138.542" y2="75.0327" stroke="var(--fg-neutral-normal)" stroke-width="5" />
            <line x1="187.785" y1="229.276" x2="188.811" y2="75.0327" stroke="var(--fg-neutral-normal)" stroke-width="5" />
        </svg>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeenAgendaGekoppeldComponent {}
