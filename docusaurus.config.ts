import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OCC',
  tagline: 'Open Computational Chemistry',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://getocc.xyz',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'peterspackman', // Usually your GitHub org/user name.
  projectName: 'getocc', // Usually your repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV',
      crossorigin: 'anonymous',
    },
  ],

  plugins: [
    './plugins/headers-plugin.js',
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/paracetamol_vdw_lse.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OCC',
      logo: {
        alt: 'OCC Logo',
        src: 'img/occ_light.png',
        srcDark: 'img/occ_dark.png',
      },
      hideOnScroll: false,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Tutorial',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          to: 'https://github.com/peterspackman/occ',
          label: 'GitHub',
          position: 'right',
        },
        {
          to: 'https://github.com/peterspackman/occ/releases',
          label: 'Releases',
          position: 'right',
        },
        {
          to: 'https://doi.org/10.5281/zenodo.10703204',
          label: 'Zenodo',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
            {
              label: 'C++ API Documentation',
              href: 'https://peterspackman.github.io/occ/',
            },
          ],
        },
        {
          title: 'Packages',
          items: [
            {
              label: 'PyPI (occpy)',
              href: 'https://pypi.org/project/occpy/',
            },
            {
              label: 'npm (@peterspackman/occjs)',
              href: 'https://www.npmjs.com/package/@peterspackman/occjs',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/peterspackman/occ',
            },
            {
              label: 'Releases',
              href: 'https://github.com/peterspackman/occ/releases',
            },
            {
              label: 'Zenodo DOI',
              href: 'https://doi.org/10.5281/zenodo.10703204',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'CrystalExplorer',
              href: 'https://crystalexplorer.net/',
            },
            {
              label: 'Wavefunction Calculator',
              href: 'https://prs.wiki/utilities/wavefunction-calculator',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OCC Project.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
