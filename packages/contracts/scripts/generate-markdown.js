#!/usr/bin/env node
const dirtree = require('directory-tree')
const fs = require('fs')
const { predeploys } = require('../dist/predeploys')

/**
 *
 * takes a directory of hardhat artifacts and builds a markdown table that shows the name of the contract in one column and its address in another column with a hyperlink to etherscan
 *
 */

const networks = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
  42069: 'mainnet-trial',
}

const publicDeployments = ['mainnet', 'mainnet-trial', 'kovan', 'kovan-trial']

;(async () => {
  console.log(`Writing contract addresses`)

  const deployments = dirtree(`./deployments`)
    .children.filter((child) => {
      return child.type === 'directory'
    })
    .map((d) => d.name)
    .reverse()
    .filter((dirname) => {
      return publicDeployments.includes(dirname)
    })

  let md = `# Optimistic Ethereum Deployments`

  md += `
  ## LAYER 2

  ### Chain IDs
  - Mainnet: 10
  - Kovan: 69
  - Goerli: 420

  ### Pre-deployed Contracts

  **NOTE**: Pre-deployed contract addresses are the same on every Optimistic Ethereum network.

  | Contract | Address |
  | -------- | ------- |
  `

  for (const [name, addr] of Object.entries(predeploys)) {
    md += `|${name}|${addr}|\n`
  }

  md += `
  ## LAYER 1
  `

  for (const deployment of deployments) {
    md += `## ${deployment.toUpperCase()}\n\n`

    const chainId = Number(
      fs.readFileSync(`./deployments/${deployment}/.chainId`)
    )
    const network = networks[chainId]

    md += `Network : __${network} (chain id: ${chainId})__\n\n`

    md += `| Contract | Address |\n`
    md += `| -------- | ------- |\n`

    const contracts = dirtree(`./deployments/${deployment}`)
      .children.filter((child) => {
        return child.extension === '.json'
      })
      .map((child) => {
        return child.name.replace('.json', '')
      })

    proxiedContracts = []
    for (let i = 0; i < contracts.length; i++) {
      if (contracts[i].startsWith('OVM_L1CrossDomainMessenger')) {
        proxiedContracts.push(contracts.splice(i, 1)[0])
      }
      if (contracts[i].startsWith('L1StandardBridge')) {
        proxiedContracts.push(contracts.splice(i, 1)[0])
      }
    }

    for (const contract of contracts) {
      const colonizedName = contract.split(':').join('-')

      const deploymentInfo = require(`../deployments/${deployment}/${contract}.json`)

      const escPrefix = chainId !== 1 ? `${network}.` : ''
      const etherscanUrl = `https://${escPrefix}etherscan.io/address/${deploymentInfo.address}`
      md += `|${colonizedName}|[${deploymentInfo.address}](${etherscanUrl})|\n`
    }

    md += `<!--\nImplementation addresses. DO NOT use these addresses directly.\nUse their proxied counterparts seen above.\n\n`

    for (const proxy of proxiedContracts) {
      const colonizedName = proxy.split(':').join('-')

      const deploymentInfo = require(`../deployments/${deployment}/${proxy}.json`)

      const escPrefix = chainId !== 1 ? `${network}.` : ''
      const etherscanUrl = `https://${escPrefix}etherscan.io/address/${deploymentInfo.address}`
      md += `${colonizedName}: \n - ${deploymentInfo.address}\n - ${etherscanUrl})\n`
    }

    md += `-->\n`
  }

  fs.writeFileSync(`./deployments/README.md`, md)
})().catch(console.error)
