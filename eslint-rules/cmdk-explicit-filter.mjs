/**
 * ESLint rule: cmdk-explicit-filter
 *
 * Flags any <Command> JSX element that:
 *  - contains a <CommandInput> descendant (i.e. the user can type to search), AND
 *  - does NOT have a `shouldFilter` prop declared
 *
 * cmdk's default fuzzy filter scores CommandItem children unreliably when
 * items have multi-element children (icons, badges, labels + trailing buttons).
 * The safe pattern is `shouldFilter={false}` + manual substring filter.
 * If fuzzy filtering is genuinely wanted, `shouldFilter={true}` must be set
 * explicitly with a comment so the choice is intentional.
 *
 * See frontend/AGENTS.md § "cmdk Command — searchable dropdowns"
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require explicit shouldFilter prop on <Command> elements that contain <CommandInput>",
      recommended: true,
    },
    messages: {
      missingExplicitFilter:
        "<Command> that contains <CommandInput> must declare shouldFilter={false}. " +
        "cmdk's default fuzzy filter is unreliable with multi-element CommandItem children. " +
        "Use shouldFilter={false} + a manual .filter() on the items array. " +
        "If fuzzy filtering is intentional, set shouldFilter={true} explicitly with a comment. " +
        "See AGENTS.md § 'cmdk Command — searchable dropdowns'.",
    },
    schema: [],
  },

  create(context) {
    return {
      // Trigger on every <CommandInput> opening tag.
      // Walk up the parent chain to find the nearest <Command> ancestor
      // and verify it declares `shouldFilter`.
      'JSXOpeningElement[name.name="CommandInput"]'(node) {
        // node          → JSXOpeningElement
        // node.parent   → JSXElement (the <CommandInput ...>...</CommandInput> element)
        let current = node.parent;

        while (current) {
          if (
            current.type === "JSXElement" &&
            current.openingElement?.name?.name === "Command"
          ) {
            const attrs = current.openingElement.attributes ?? [];
            const hasFilter = attrs.some(
              (attr) =>
                attr.type === "JSXAttribute" &&
                attr.name?.name === "shouldFilter"
            );

            if (!hasFilter) {
              context.report({
                node: current.openingElement,
                messageId: "missingExplicitFilter",
              });
            }

            // Stop at the first Command ancestor regardless of result.
            return;
          }

          current = current.parent;
        }
      },
    };
  },
};

export default rule;
