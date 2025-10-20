import type { PrismTheme } from 'prism-react-renderer';

// Tokyo Night Day (Light Mode)
export const tokyoNightDay: PrismTheme = {
  plain: {
    color: '#3760bf',
    backgroundColor: '#e1e2e7',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#848cb5',
        fontStyle: 'italic',
      },
    },
    {
      types: ['namespace'],
      style: {
        opacity: 0.7,
      },
    },
    {
      types: ['string', 'attr-value'],
      style: {
        color: '#587539',
      },
    },
    {
      types: ['punctuation', 'operator'],
      style: {
        color: '#3760bf',
      },
    },
    {
      types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'property', 'regex', 'inserted'],
      style: {
        color: '#b15c00',
      },
    },
    {
      types: ['atrule', 'keyword', 'attr-name', 'selector'],
      style: {
        color: '#7847bd',
      },
    },
    {
      types: ['function', 'deleted', 'tag'],
      style: {
        color: '#006a83',
      },
    },
    {
      types: ['function-variable'],
      style: {
        color: '#8839ef',
      },
    },
    {
      types: ['tag', 'selector', 'keyword'],
      style: {
        color: '#2e7de9',
      },
    },
  ],
};

// Tokyo Night Storm (Dark Mode)
export const tokyoNightStorm: PrismTheme = {
  plain: {
    color: '#c0caf5',
    backgroundColor: '#1a1b26',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#565f89',
        fontStyle: 'italic',
      },
    },
    {
      types: ['namespace'],
      style: {
        opacity: 0.7,
      },
    },
    {
      types: ['string', 'attr-value'],
      style: {
        color: '#9ece6a',
      },
    },
    {
      types: ['punctuation', 'operator'],
      style: {
        color: '#89ddff',
      },
    },
    {
      types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'property', 'regex', 'inserted'],
      style: {
        color: '#ff9e64',
      },
    },
    {
      types: ['atrule', 'keyword', 'attr-name', 'selector'],
      style: {
        color: '#bb9af7',
      },
    },
    {
      types: ['function', 'deleted', 'tag'],
      style: {
        color: '#7dcfff',
      },
    },
    {
      types: ['function-variable'],
      style: {
        color: '#bb9af7',
      },
    },
    {
      types: ['tag', 'selector', 'keyword'],
      style: {
        color: '#7aa2f7',
      },
    },
  ],
};
