import { expect } from "chai";

import JSSResponseMapper from "../jss-response-mapper";
import { JSSJob, JSSUpdateJobRequest } from "../types";

import { mockJSSJob } from "./mocks";

describe("JSSResponseMapper", () => {
  describe("map", () => {
    it("does not modify response if no service fields", () => {
      const result = JSSResponseMapper.map(mockJSSJob);
      expect(result).to.deep.equal(mockJSSJob);
    });
    it("expands service fields", () => {
      const now = new Date();
      const input = {
        ...mockJSSJob,
        serviceFields: {
          favorites: {
            boolean: true,
            color: "red",
            number: 9,
            date: now,
            movies: {
              "0": "Harry Potter",
              "1": "Insomnia",
            },
            fruit: {
              "0": "Apple",
              "2": "Banana",
            },
          },
          files: {
            "0": {
              created: now,
              file: {
                customField: {
                  age: 15,
                },
                originalPath: "/path/to/file",
                filename: "file",
              },
              fileType: "text",
            },
            "1": {
              fileType: "image",
              file: {
                originalPath: "/path/to/file2",
                filename: "file2",
              },
            },
          },
        },
      };
      const metadata = {
        fileType: "text",
        file: {
          customField: {
            age: 15,
          },
          originalPath: "/path/to/file",
          filename: "file",
        },
        created: now,
      };
      const metadata2 = {
        fileType: "image",
        file: {
          originalPath: "/path/to/file2",
          filename: "file2",
        },
      };
      const expected: JSSUpdateJobRequest = {
        ...mockJSSJob,
        serviceFields: {
          files: [metadata, metadata2],
          favorites: {
            boolean: true,
            color: "red",
            fruit: {
              "0": "Apple",
              "2": "Banana",
            },
            number: 9,
            date: now,
            movies: ["Harry Potter", "Insomnia"],
          },
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equals(expected);
    });
    it("converts file extension dummy '(dot)' with '.'", () => {
      const input: JSSJob = {
        ...mockJSSJob,
        serviceFields: {
          "foo(dot)txt": "bar(dot)txt",
        },
      };
      const expected: JSSJob = {
        ...mockJSSJob,
        serviceFields: {
          "foo.txt": "bar(dot)txt",
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equal(expected);
    });
    it("preserves non service fields if service fields provided", () => {
      const currentStage = "copying";
      const input: JSSJob = {
        ...mockJSSJob,
        currentStage,
        serviceFields: {
          foo: "bar",
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result.currentStage).to.deep.equal(currentStage);
    });
  });
});
