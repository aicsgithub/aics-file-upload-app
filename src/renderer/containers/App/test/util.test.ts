import { expect } from "chai";

import { ColumnType } from "../../../state/setting/types";
import { isColumnDefinition, isSchemaDefinition } from "../util";

describe("App util", () => {
    const validColumn = {
        label: "Name",
        type: {
            type: ColumnType.TEXT,
        },
    };
    const validSchema = {
        columns: [validColumn],
        notes: "A note",
    };
    describe("isColumnDefinition", () => {
        it("returns false if column is undefined", () => {
            expect(isColumnDefinition(undefined)).to.be.false;
        });

        it("returns false if label is not defined", () => {
            expect(isColumnDefinition({...validColumn, label: undefined})).to.be.false;
        });

        it("returns false if label is not a string", () => {
            expect(isColumnDefinition({...validColumn, label: 1})).to.be.false;
        });

        it("returns false if type is undefined", () => {
            expect(isColumnDefinition({...validColumn, type: undefined})).to.be.false;
        });

        it("returns false if type.type is undefined", () => {
            expect(isColumnDefinition({...validColumn, type: {}})).to.be.false;
        });

        it("returns false if type.type is not a ColumnType", () => {
            expect(isColumnDefinition({...validColumn, type: {type: 100}})).to.be.false;
        });
    });

    describe("isSchemaDefinition", () => {
        it("returns false if input is undefined", () => {
            expect(isSchemaDefinition(undefined)).to.be.false;
        });

        it("returns false if notes are set to a boolean", () => {
            expect(isSchemaDefinition({...validSchema, notes: true})).to.be.false;
        });

        it("returns true if schema is valid", () => {
            expect(isSchemaDefinition(validSchema)).to.be.true;
        });
    });
});
