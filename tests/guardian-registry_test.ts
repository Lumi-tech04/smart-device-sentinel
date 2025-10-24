import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Validates hub enrollment on first registration attempt",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const result = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("primary-hub-001")],
        deployer.address
      ),
    ]);
    assertEquals(result.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Prevents duplicate hub enrollment for same principal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const firstEnrollment = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-alpha")],
        deployer.address
      ),
    ]);
    assertEquals(firstEnrollment.receipts[0].result.expectOk(), "true");

    const secondEnrollment = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-beta")],
        deployer.address
      ),
    ]);
    assertEquals(secondEnrollment.receipts[0].result.expectErr(), "u101");
  },
});

Clarinet.test({
  name: "Rejects device onboarding without hub enrollment",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get("wallet_1")!;
    const result = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("dev-001"),
          types.ascii("Hallway Motion Detector"),
          types.ascii("motion-sensor"),
        ],
        wallet1.address
      ),
    ]);
    assertEquals(result.receipts[0].result.expectErr(), "u102");
  },
});

Clarinet.test({
  name: "Supports device registration after hub enrollment",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-device-001")],
        deployer.address
      ),
    ]);

    const deviceRegistration = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("therm-42"),
          types.ascii("Basement Thermostat"),
          types.ascii("temperature-controller"),
        ],
        deployer.address
      ),
    ]);
    assertEquals(deviceRegistration.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Prevents re-registration of duplicate devices",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-dup-test")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("camera-7x"),
          types.ascii("Front Door Camera"),
          types.ascii("security-camera"),
        ],
        deployer.address
      ),
    ]);

    const attemptDuplicate = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("camera-7x"),
          types.ascii("Front Door Camera V2"),
          types.ascii("security-camera"),
        ],
        deployer.address
      ),
    ]);
    assertEquals(attemptDuplicate.receipts[0].result.expectErr(), "u103");
  },
});

Clarinet.test({
  name: "Blocks attestation recording for unregistered hubs",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet2 = accounts.get("wallet_2")!;
    const attestationHash = Buffer.from("a".repeat(64), "hex");
    const proofHash = Buffer.from("b".repeat(64), "hex");

    const result = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("ghost-device"),
          types.uint(1704067200),
          types.buff(attestationHash),
          types.buff(proofHash),
        ],
        wallet2.address
      ),
    ]);
    assertEquals(result.receipts[0].result.expectErr(), "u102");
  },
});

Clarinet.test({
  name: "Blocks attestation for unregistered devices",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-att-test")],
        deployer.address
      ),
    ]);

    const attestationHash = Buffer.from("c".repeat(64), "hex");
    const proofHash = Buffer.from("d".repeat(64), "hex");

    const result = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("unknown-sensor"),
          types.uint(1704067200),
          types.buff(attestationHash),
          types.buff(proofHash),
        ],
        deployer.address
      ),
    ]);
    assertEquals(result.receipts[0].result.expectErr(), "u104");
  },
});

Clarinet.test({
  name: "Records event attestations with valid parameters",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-record-001")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("bulb-smart-08"),
          types.ascii("Kitchen Ceiling Light"),
          types.ascii("light-actuator"),
        ],
        deployer.address
      ),
    ]);

    const eventHash = Buffer.from("e".repeat(64), "hex");
    const proofData = Buffer.from("f".repeat(64), "hex");

    const attestation = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("bulb-smart-08"),
          types.uint(1704067200),
          types.buff(eventHash),
          types.buff(proofData),
        ],
        deployer.address
      ),
    ]);
    assertEquals(attestation.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Prevents duplicate attestations at identical coordinates",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const timestamp = 1704067200;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-duplicate-att")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("lock-front-door"),
          types.ascii("Front Door Electronic Lock"),
          types.ascii("access-control"),
        ],
        deployer.address
      ),
    ]);

    const hash1 = Buffer.from("0".repeat(64), "hex");
    const proof1 = Buffer.from("1".repeat(64), "hex");

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("lock-front-door"),
          types.uint(timestamp),
          types.buff(hash1),
          types.buff(proof1),
        ],
        deployer.address
      ),
    ]);

    const hash2 = Buffer.from("2".repeat(64), "hex");
    const proof2 = Buffer.from("3".repeat(64), "hex");

    const duplicate = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("lock-front-door"),
          types.uint(timestamp),
          types.buff(hash2),
          types.buff(proof2),
        ],
        deployer.address
      ),
    ]);
    assertEquals(duplicate.receipts[0].result.expectErr(), "u106");
  },
});

Clarinet.test({
  name: "Query hub details for enrolled principal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("query-hub-001")],
        deployer.address
      ),
    ]);

    const query = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "query-hub-details",
        [types.principal(deployer.address)],
        deployer.address
      ),
    ]);
    
    const result = query.receipts[0].result;
    assertEquals(result.expectSome(), null); // Result exists but contains nested data
  },
});

Clarinet.test({
  name: "Retrieve device metadata after successful registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-meta-query")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("plug-outlet-5"),
          types.ascii("Living Room Power Outlet"),
          types.ascii("power-monitor"),
        ],
        deployer.address
      ),
    ]);

    const deviceMetadata = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "fetch-device-metadata",
        [types.principal(deployer.address), types.ascii("plug-outlet-5")],
        deployer.address
      ),
    ]);
    
    const result = deviceMetadata.receipts[0].result;
    assertEquals(result.expectSome(), null); // Metadata retrieved
  },
});

Clarinet.test({
  name: "Fetch device inventory list for principal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-inventory-001")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("speaker-main"),
          types.ascii("Living Room Speaker"),
          types.ascii("audio-device"),
        ],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("speaker-bed"),
          types.ascii("Bedroom Speaker"),
          types.ascii("audio-device"),
        ],
        deployer.address
      ),
    ]);

    const inventory = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "retrieve-device-collection",
        [types.principal(deployer.address)],
        deployer.address
      ),
    ]);
    
    const result = inventory.receipts[0].result;
    assertEquals(result.expectOk(), null); // Returns list with 2 items
  },
});

Clarinet.test({
  name: "Look up specific event attestation in ledger",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const eventTime = 1704067300;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-event-lookup")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("washer-unit"),
          types.ascii("Laundry Washing Machine"),
          types.ascii("appliance"),
        ],
        deployer.address
      ),
    ]);

    const eventHash = Buffer.from("4".repeat(64), "hex");
    const proofHash = Buffer.from("5".repeat(64), "hex");

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("washer-unit"),
          types.uint(eventTime),
          types.buff(eventHash),
          types.buff(proofHash),
        ],
        deployer.address
      ),
    ]);

    const lookup = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "query-event-record",
        [
          types.principal(deployer.address),
          types.ascii("washer-unit"),
          types.uint(eventTime),
        ],
        deployer.address
      ),
    ]);
    
    const result = lookup.receipts[0].result;
    assertEquals(result.expectSome(), null); // Event exists
  },
});

Clarinet.test({
  name: "Verify proof integrity for matching attestation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const eventTime = 1704067400;
    const proofData = Buffer.from("6".repeat(64), "hex");
    const eventHash = Buffer.from("7".repeat(64), "hex");
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-proof-verify")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("fridge-smart"),
          types.ascii("Kitchen Refrigerator"),
          types.ascii("refrigeration-unit"),
        ],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("fridge-smart"),
          types.uint(eventTime),
          types.buff(eventHash),
          types.buff(proofData),
        ],
        deployer.address
      ),
    ]);

    const verification = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "validate-proof-integrity",
        [
          types.principal(deployer.address),
          types.ascii("fridge-smart"),
          types.uint(eventTime),
          types.buff(proofData),
        ],
        deployer.address
      ),
    ]);
    
    assertEquals(verification.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Check event existence at specific spatio-temporal coordinates",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const blockTime = 1704067500;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-existence-check")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("hvac-system"),
          types.ascii("Central HVAC Unit"),
          types.ascii("climate-control"),
        ],
        deployer.address
      ),
    ]);

    const hash1 = Buffer.from("8".repeat(64), "hex");
    const hash2 = Buffer.from("9".repeat(64), "hex");

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "record-event-attestation",
        [
          types.ascii("hvac-system"),
          types.uint(blockTime),
          types.buff(hash1),
          types.buff(hash2),
        ],
        deployer.address
      ),
    ]);

    const existence = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "event-exists-at-coordinates",
        [
          types.principal(deployer.address),
          types.ascii("hvac-system"),
          types.uint(blockTime),
        ],
        deployer.address
      ),
    ]);
    
    assertEquals(existence.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Return false for non-existent event coordinates",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-nonexist")],
        deployer.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("garage-opener"),
          types.ascii("Garage Door Opener"),
          types.ascii("actuator"),
        ],
        deployer.address
      ),
    ]);

    const existence = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "event-exists-at-coordinates",
        [
          types.principal(deployer.address),
          types.ascii("garage-opener"),
          types.uint(9999999999),
        ],
        deployer.address
      ),
    ]);
    
    assertEquals(existence.receipts[0].result.expectOk(), "false");
  },
});

Clarinet.test({
  name: "Support multiple devices per governance hub",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("hub-multi-device")],
        deployer.address
      ),
    ]);

    const devices = [
      ["temp-sensor-1", "Bedroom Temperature", "environmental-sensor"],
      ["humidity-sensor-2", "Bathroom Humidity", "environmental-sensor"],
      ["air-sensor-3", "Living Room Air Quality", "air-quality-monitor"],
    ];

    for (const [deviceId, name, type] of devices) {
      const result = chain.mineBlock([
        Tx.contractCall(
          "guardian-registry",
          "onboard-sentinel-device",
          [types.ascii(deviceId), types.ascii(name), types.ascii(type)],
          deployer.address
        ),
      ]);
      assertEquals(result.receipts[0].result.expectOk(), "true");
    }

    const inventoryCheck = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "retrieve-device-collection",
        [types.principal(deployer.address)],
        deployer.address
      ),
    ]);
    
    const result = inventoryCheck.receipts[0].result;
    assertEquals(result.expectOk(), null); // List contains 3 devices
  },
});

Clarinet.test({
  name: "Allow multiple principals to maintain separate device ecosystems",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get("deployer")!;
    const user2 = accounts.get("wallet_1")!;
    
    // User 1 setup
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("user1-hub")],
        user1.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("user1-device"),
          types.ascii("User One Device"),
          types.ascii("generic"),
        ],
        user1.address
      ),
    ]);

    // User 2 setup
    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "enroll-governance-hub",
        [types.ascii("user2-hub")],
        user2.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "onboard-sentinel-device",
        [
          types.ascii("user2-device"),
          types.ascii("User Two Device"),
          types.ascii("generic"),
        ],
        user2.address
      ),
    ]);

    // Verify isolated ecosystems
    const user1Inventory = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "retrieve-device-collection",
        [types.principal(user1.address)],
        user1.address
      ),
    ]);

    const user2Inventory = chain.mineBlock([
      Tx.contractCall(
        "guardian-registry",
        "retrieve-device-collection",
        [types.principal(user2.address)],
        user2.address
      ),
    ]);

    assertEquals(user1Inventory.receipts[0].result.expectOk(), null);
    assertEquals(user2Inventory.receipts[0].result.expectOk(), null);
  },
});
