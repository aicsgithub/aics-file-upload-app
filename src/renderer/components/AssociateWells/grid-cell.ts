import { AicsGridCell } from "@aics/aics-react-labkey";

export class GridCell implements AicsGridCell {
    public readonly row: number;
    public readonly col: number;

    constructor(row: number, col: number) {
        this.row = row;
        this.col = col;
    }

    public equals(other: GridCell): boolean {
        return this.row === other.row && this.col === other.col;
    }
}
