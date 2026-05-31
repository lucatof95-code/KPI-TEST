import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.report.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.activityCompetencyArea.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.session.deleteMany()
  await prisma.competencyArea.deleteMany()
  await prisma.user.deleteMany()

  // Users
  const masterPwd = await bcrypt.hash('master123', 12)
  const userPwd = await bcrypt.hash('user123', 12)

  const master = await prisma.user.create({
    data: { nome: 'Admin', cognome: 'Master', email: 'master@kpi.test', passwordHash: masterPwd, ruolo: 'MASTER' },
  })

  const alice = await prisma.user.create({
    data: { nome: 'Alice', cognome: 'Rossi', email: 'alice@kpi.test', passwordHash: userPwd, ruolo: 'USER' },
  })
  const bob = await prisma.user.create({
    data: { nome: 'Bob', cognome: 'Verdi', email: 'bob@kpi.test', passwordHash: userPwd, ruolo: 'USER' },
  })
  const cara = await prisma.user.create({
    data: { nome: 'Cara', cognome: 'Bianchi', email: 'cara@kpi.test', passwordHash: userPwd, ruolo: 'USER' },
  })

  // Competency Areas
  const areaVendite = await prisma.competencyArea.create({ data: { nome: 'Vendite e Fatturazione', importanza: 5 } })
  const areaLogistica = await prisma.competencyArea.create({ data: { nome: 'Logistica e Magazzino', importanza: 4 } })
  const areaContabilita = await prisma.competencyArea.create({ data: { nome: 'Contabilità e Finanza', importanza: 4 } })
  const areaHR = await prisma.competencyArea.create({ data: { nome: 'Risorse Umane', importanza: 2 } })
  const areaIT = await prisma.competencyArea.create({ data: { nome: 'Sistemi IT e Infrastruttura', importanza: 3 } })

  // Sessions
  const sess1 = await prisma.session.create({ data: { nome: 'Sessione 1 – Onboarding', ordine: 1 } })
  const sess2 = await prisma.session.create({ data: { nome: 'Sessione 2 – Moduli Core', ordine: 2 } })
  const sess3 = await prisma.session.create({ data: { nome: 'Sessione 3 – Avanzato', ordine: 3 } })

  // Activities
  const actIntroERP = await prisma.activity.create({
    data: {
      nome: 'Introduzione al nuovo ERP',
      descrizione: 'Panoramica generale della nuova piattaforma gestionale, navigazione e concetti base.',
      tipo: 'FORMAZIONE',
      areas: { create: [{ competencyAreaId: areaIT.id }] },
    },
  })
  const actVenditeForm = await prisma.activity.create({
    data: {
      nome: 'Gestione ordini di vendita',
      descrizione: 'Creazione, modifica e tracciamento degli ordini cliente nel nuovo sistema.',
      tipo: 'FORMAZIONE',
      areas: { create: [{ competencyAreaId: areaVendite.id }] },
    },
  })
  const actVenditeTest = await prisma.activity.create({
    data: {
      nome: 'Test: Ciclo Vendite Completo',
      descrizione: 'Verifica pratica sull\'inserimento di un ordine, emissione DDT e fattura.',
      tipo: 'TEST',
      areas: { create: [{ competencyAreaId: areaVendite.id }, { competencyAreaId: areaContabilita.id }] },
    },
  })
  const actMagazzino = await prisma.activity.create({
    data: {
      nome: 'Gestione movimenti magazzino',
      descrizione: 'Entrate, uscite, trasferimenti e inventario nel modulo logistica.',
      tipo: 'FORMAZIONE',
      areas: { create: [{ competencyAreaId: areaLogistica.id }] },
    },
  })
  const actContabilita = await prisma.activity.create({
    data: {
      nome: 'Prima nota e riconciliazione',
      descrizione: 'Inserimento movimenti contabili e riconciliazione estratti conto.',
      tipo: 'FORMAZIONE',
      areas: { create: [{ competencyAreaId: areaContabilita.id }] },
    },
  })
  const actTestMagazzinoContab = await prisma.activity.create({
    data: {
      nome: 'Test: Flusso Acquisti e Magazzino',
      descrizione: 'Simulazione completa: ordine fornitore, ricevimento merce, registrazione fattura.',
      tipo: 'TEST',
      areas: {
        create: [
          { competencyAreaId: areaLogistica.id },
          { competencyAreaId: areaContabilita.id },
        ],
      },
    },
  })

  // Assignments – Alice
  const today = new Date()
  const past = (d: number) => new Date(today.getTime() - d * 86400000)
  const future = (d: number) => new Date(today.getTime() + d * 86400000)

  const asgAlice1 = await prisma.assignment.create({
    data: { activityId: actIntroERP.id, userId: alice.id, sessionId: sess1.id, dataScadenza: past(10) },
  })
  const asgAlice2 = await prisma.assignment.create({
    data: { activityId: actVenditeForm.id, userId: alice.id, sessionId: sess1.id, dataScadenza: past(5) },
  })
  const asgAlice3 = await prisma.assignment.create({
    data: { activityId: actVenditeTest.id, userId: alice.id, sessionId: sess2.id, dataScadenza: future(3) },
  })
  const asgAlice4 = await prisma.assignment.create({
    data: { activityId: actMagazzino.id, userId: alice.id, sessionId: sess2.id, dataScadenza: future(5) },
  })
  await prisma.assignment.create({
    data: { activityId: actContabilita.id, userId: alice.id, sessionId: sess3.id, dataScadenza: future(15) },
  })

  // Assignments – Bob
  const asgBob1 = await prisma.assignment.create({
    data: { activityId: actIntroERP.id, userId: bob.id, sessionId: sess1.id, dataScadenza: past(8) },
  })
  const asgBob2 = await prisma.assignment.create({
    data: { activityId: actMagazzino.id, userId: bob.id, sessionId: sess1.id, dataScadenza: past(3) },
  })
  await prisma.assignment.create({
    data: { activityId: actTestMagazzinoContab.id, userId: bob.id, sessionId: sess2.id, dataScadenza: future(7) },
  })

  // Assignments – Cara
  const asgCara1 = await prisma.assignment.create({
    data: { activityId: actIntroERP.id, userId: cara.id, sessionId: sess1.id, dataScadenza: past(15) },
  })
  await prisma.assignment.create({
    data: { activityId: actContabilita.id, userId: cara.id, sessionId: sess1.id, dataScadenza: past(7) },
  })

  // Reports – Alice completes session 1
  await prisma.report.create({
    data: {
      assignmentId: asgAlice1.id, userId: alice.id, activityId: actIntroERP.id,
      obiettivo: 8, complessita: 4, confrontoVecchioERP: 7, miglioramentoEfficienza: 8,
      haProblemi: false, richiedeNuovaFormazione: false, giudizioApprendimento: 85,
    },
  })
  await prisma.assignment.update({ where: { id: asgAlice1.id }, data: { stato: 'SVOLTA' } })

  await prisma.report.create({
    data: {
      assignmentId: asgAlice2.id, userId: alice.id, activityId: actVenditeForm.id,
      obiettivo: 7, complessita: 6, confrontoVecchioERP: 5, miglioramentoEfficienza: 7,
      haProblemi: true, descrizioneProblema: 'La procedura di creazione ordine con listini multipli non è chiara: servono esempi pratici con sconti a cascata.',
      richiedeNuovaFormazione: true,
      statoRisoluzione: 'IN_LAVORAZIONE',
    },
  })
  await prisma.assignment.update({ where: { id: asgAlice2.id }, data: { stato: 'SVOLTA' } })

  // Report – Bob completes intro
  await prisma.report.create({
    data: {
      assignmentId: asgBob1.id, userId: bob.id, activityId: actIntroERP.id,
      obiettivo: 9, complessita: 3, confrontoVecchioERP: 8, miglioramentoEfficienza: 9,
      haProblemi: false, richiedeNuovaFormazione: false, giudizioApprendimento: 92,
    },
  })
  await prisma.assignment.update({ where: { id: asgBob1.id }, data: { stato: 'SVOLTA' } })

  await prisma.report.create({
    data: {
      assignmentId: asgBob2.id, userId: bob.id, activityId: actMagazzino.id,
      obiettivo: 6, complessita: 7, confrontoVecchioERP: 4, miglioramentoEfficienza: 6,
      haProblemi: true, descrizioneProblema: 'Il modulo di trasferimento inter-magazzino si blocca quando si selezionano più di 50 righe. Necessaria correzione o workaround documentato.',
      richiedeNuovaFormazione: false, giudizioApprendimento: 70,
      statoRisoluzione: 'APERTO',
    },
  })
  await prisma.assignment.update({ where: { id: asgBob2.id }, data: { stato: 'SVOLTA' } })

  // Report – Cara
  await prisma.report.create({
    data: {
      assignmentId: asgCara1.id, userId: cara.id, activityId: actIntroERP.id,
      obiettivo: 7, complessita: 5, confrontoVecchioERP: 6, miglioramentoEfficienza: 7,
      haProblemi: false, richiedeNuovaFormazione: false, giudizioApprendimento: 78,
    },
  })
  await prisma.assignment.update({ where: { id: asgCara1.id }, data: { stato: 'SVOLTA' } })

  console.log('✅ Seed completato!')
  console.log('  Master: master@kpi.test / master123')
  console.log('  Alice:  alice@kpi.test  / user123')
  console.log('  Bob:    bob@kpi.test    / user123')
  console.log('  Cara:   cara@kpi.test   / user123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
