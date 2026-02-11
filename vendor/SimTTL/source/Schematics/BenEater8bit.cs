// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;
using ChipLibrary;
using System.Security.Cryptography;
using System.Runtime.Remoting.Messaging;
using static SimBase.ResetGenerator;

namespace Schematics
{
    public class BenEater8bit : BaseSchematics
    {
        public const string SCHEMATICS_NAME = "BenEater8bit";

        private ResetGenerator RST;

        // Schematics Page 6 of 11 : Clock
        private LM555 U1;
        private LM555 U2;
        private LM555 U3;
        private HCT04 U4;
        private HCT08 U5;
        private HCT32 U6;
        private SignalLabel CLK;
        private SignalLabel CLKn;
        private SignalLabel HLT;

        // Schematics Page 8 of 11 : A Register
        private SignalBus BUS;
        private SignalLabel CLR;
        private SignalLabel AIn;
        private SignalLabel AOn;
        private HCT245 U7;
        private HCT173 U8;
        private HCT173 U9;
        private SignalBus A;

        // Schematics Page 9 of 11 : B Register
        private SignalLabel BIn;
        private SignalLabel BOn;
        private HCT245 U10;
        private HCT173 U11;
        private HCT173 U12;
        private SignalBus B;

        // Schematics Page 5 of 11 : IR Register
        private SignalLabel IIn;
        private SignalLabel IOn;
        private HCT245 U13;
        private HCT173 U14;
        private HCT173 U15;
        private SignalBus IR;


        // Schematics Page 11 of 11 : ALU
        private SignalLabel EOn;
        private SignalLabel SU;
        private SignalLabel FIn;
        private HCT86 U16;
        private HCT245 U17;
        private HCT86 U18;
        private HCT173 U19;
        private HCT283 U20;
        private HCT283 U21;
        private HCT02 U22;
        private HCT08 U23;
        private SignalLabel CF;
        private SignalLabel ZF;


        // Schematics Page 4 of 11 : RAM
        private SignalBus ADDR;
        private SignalLabel RI;
        private SignalLabel ROn;
        private SignalLabel PROG;
        private RC_HP RCHP;
        private F189 U24;
        private F189 U25;
        private HCT157 U26;
        private HCT157 U27;
        private HCT04 U28;
        private HCT04 U29;
        private HCT245 U30;
        private HCT00 U31;
        private HCT157 U32;

        // Schematics Page 3 of 11 : MAR
        private SignalLabel MIn;
        private HCT157 U33;
        private HCT173 U34;

        // Schematics Page 7 of 11 : PC
        private SignalLabel CE;
        private SignalLabel Jn;
        private SignalLabel CLRn;
        private SignalLabel COn;
        private HCT161 U35;
        private HCT245 U36;
        private SignalBus PC;


        // Schematics Page 10 of 11 : Output
        private SignalLabel OI;
        private HCT76 U37;
        private HCT139 U38;
        private LM555 U39;
        private HCT273 U44;
        private AT28C16 U45;
        private HCT08 U46;


        // Schematics Page 2 of 11 : Control Logic
        private SignalBus MCstep;
        private AT28C16 U47;
        private HCT161 U48;
        private HCT04 U49;
        private HCT138 U50;
        private HCT00 U51;
        private AT28C16 U52;
        private HCT04 U53;
        private CustomBus Mnemonic;

        private string ROMfileName;
        private string RAMfileName;

        public BenEater8bit() : base(SCHEMATICS_NAME)
        {
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;

            Elements.Add(RST = new ResetGenerator("RST", 1000000));
            Net netRST = new Net(RST.Out);
            RST.ResetEndEvent += RST_ResetEndEvent;

            // Schematics Page 6 of 11 : Clock
            Elements.Add(U1 = new LM555("U1", H, H, 5.0, 1e3, 1e3, 1e-6));      
            Elements.Add(U2 = new LM555("U2", H, H, 5.0, 1e6, 0, 0.1e-6));
            Elements.Add(U3 = new LM555("U3", H, H, 5.0, double.MaxValue, double.MaxValue, 0));
            Net netHLT = new Net("HLT");
            Elements.Add(HLT = new SignalLabel("HLT", netHLT));

            Net netU3Q = new Net(U3.Q);
            Elements.Add(U4 = new HCT04("U4", netU3Q, null, netHLT, L, L, L));
            Elements.Add(U5 = new HCT08("U5", new Net(U1.Q), netU3Q, new Net(U4.O1Y), new Net(U2.Q), null, new Net(U4.O3Y), L, L));
            Elements.Add(U6 = new HCT32("U6", new Net(U5.O1Y), new Net(U5.O2Y), L, L, L, L, L, L));
            U5.I3A.ConnectedNet = new Net(U6.O1Y);
            Net netU5O3Y = new Net(U5.O3Y);
            U4.I6A.ConnectedNet = netU5O3Y;
            Elements.Add(CLK = new SignalLabel("CLK", netU5O3Y));
            Elements.Add(CLKn = new SignalLabel("CLKn", new Net(U4.O6Y)));

            // Schematics Page 8 of 11 : A Register
            Elements.Add(BUS = new SignalBus("BUS", 8));
            Elements.Add(CLR = new SignalLabel("CLR", new Net()));
            Elements.Add(AIn = new SignalLabel("AIn", new Net()));
            Elements.Add(AOn = new SignalLabel("AOn", new Net()));
            Elements.Add(U8 = new HCT173("U8", CLK.Net, CLR.Net, L, L, AIn.Net, AIn.Net, BUS[7], BUS[6], BUS[5], BUS[4]));
            Elements.Add(U9 = new HCT173("U9", CLK.Net, CLR.Net, L, L, AIn.Net, AIn.Net, BUS[3], BUS[2], BUS[1], BUS[0]));
            Net netU8Q0 = new Net(U8.Q0);
            Net netU8Q1 = new Net(U8.Q1);
            Net netU8Q2 = new Net(U8.Q2);
            Net netU8Q3 = new Net(U8.Q3);
            Net netU9Q0 = new Net(U9.Q0);
            Net netU9Q1 = new Net(U9.Q1);
            Net netU9Q2 = new Net(U9.Q2);
            Net netU9Q3 = new Net(U9.Q3);
            Elements.Add(U7 = new HCT245("U7", H, AOn.Net, netU8Q0, netU8Q1, netU8Q2, netU8Q3, netU9Q0, netU9Q1, netU9Q2, netU9Q3));
            BUS.AddPins(new Pin[] { U7.B7, U7.B6, U7.B5, U7.B4, U7.B3, U7.B2, U7.B1, U7.B0 });
            Elements.Add(A = new SignalBus("A", new Net[] { netU9Q3, netU9Q2, netU9Q1, netU9Q0, netU8Q3, netU8Q2, netU8Q1, netU8Q0 }));

            // Schematics Page 9 of 11 : B Register
            Elements.Add(BIn = new SignalLabel("BIn", new Net()));
            Elements.Add(BOn = new SignalLabel("BOn", H));
            Elements.Add(U11 = new HCT173("U11", CLK.Net, CLR.Net, L, L, BIn.Net, BIn.Net, BUS[7], BUS[6], BUS[5], BUS[4]));
            Elements.Add(U12 = new HCT173("U12", CLK.Net, CLR.Net, L, L, BIn.Net, BIn.Net, BUS[3], BUS[2], BUS[1], BUS[0]));
            Net netU11Q0 = new Net(U11.Q0);
            Net netU11Q1 = new Net(U11.Q1);
            Net netU11Q2 = new Net(U11.Q2);
            Net netU11Q3 = new Net(U11.Q3);
            Net netU12Q0 = new Net(U12.Q0);
            Net netU12Q1 = new Net(U12.Q1);
            Net netU12Q2 = new Net(U12.Q2);
            Net netU12Q3 = new Net(U12.Q3);
            Elements.Add(U10 = new HCT245("U10", H, BOn.Net, netU11Q0, netU11Q1, netU11Q2, netU11Q3, netU12Q0, netU12Q1, netU12Q2, netU12Q3));
            BUS.AddPins(new Pin[] { U10.B7, U10.B6, U10.B5, U10.B4, U10.B3, U10.B2, U10.B1, U10.B0 });
            Elements.Add(B = new SignalBus("B", new Net[] { netU12Q3, netU12Q2, netU12Q1, netU12Q0, netU11Q3, netU11Q2, netU11Q1, netU11Q0 }));

            // Schematics Page 5 of 11 : IR Register
            Elements.Add(IIn = new SignalLabel("IIn", new Net()));
            Elements.Add(IOn = new SignalLabel("IOn", new Net()));
            Elements.Add(U14 = new HCT173("U14", CLK.Net, CLR.Net, L, L, IIn.Net, IIn.Net, BUS[7], BUS[6], BUS[5], BUS[4]));
            Elements.Add(U15 = new HCT173("U15", CLK.Net, CLR.Net, L, L, IIn.Net, IIn.Net, BUS[3], BUS[2], BUS[1], BUS[0]));
            Net netU14Q0 = new Net(U14.Q0);
            Net netU14Q1 = new Net(U14.Q1);
            Net netU14Q2 = new Net(U14.Q2);
            Net netU14Q3 = new Net(U14.Q3);
            Net netU15Q0 = new Net(U15.Q0);
            Net netU15Q1 = new Net(U15.Q1);
            Net netU15Q2 = new Net(U15.Q2);
            Net netU15Q3 = new Net(U15.Q3);
            Elements.Add(U13 = new HCT245("U13", H, IOn.Net, L, L, L, L, netU15Q0, netU15Q1, netU15Q2, netU15Q3));
            BUS.AddPins(new Pin[] { U13.B7, U13.B6, U13.B5, U13.B4, U13.B3, U13.B2, U13.B1, U13.B0 });
            Elements.Add(IR = new SignalBus("IR", new Net[] { netU15Q3, netU15Q2, netU15Q1, netU15Q0, netU14Q3, netU14Q2, netU14Q1, netU14Q0 }));

            // Schematics Page 11 of 11 : ALU
            Elements.Add(EOn = new SignalLabel("EOn", new Net()));
            Elements.Add(SU = new SignalLabel("SU", new Net()));
            Elements.Add(FIn = new SignalLabel("FIn", new Net()));

            Elements.Add(U16 = new HCT86("U16", B[7], SU.Net, B[6], SU.Net, B[5], SU.Net, B[4], SU.Net));
            Elements.Add(U18 = new HCT86("U18", B[3], SU.Net, B[2], SU.Net, B[1], SU.Net, B[0], SU.Net));
            Elements.Add(U21 = new HCT283("U21", SU.Net, A[0], A[1], A[2], A[3], new Net(U18.O4Y), new Net(U18.O3Y), new Net(U18.O2Y), new Net(U18.O1Y)));
            Elements.Add(U20 = new HCT283("U20", new Net(U21.COUT), A[4], A[5], A[6], A[7], new Net(U16.O4Y), new Net(U16.O3Y), new Net(U16.O2Y), new Net(U16.O1Y)));
            Net netU20S0 = new Net(U20.S0);
            Net netU20S1 = new Net(U20.S1);
            Net netU20S2 = new Net(U20.S2);
            Net netU20S3 = new Net(U20.S3);
            Net netU21S0 = new Net(U21.S0);
            Net netU21S1 = new Net(U21.S1);
            Net netU21S2 = new Net(U21.S2);
            Net netU21S3 = new Net(U21.S3);
            Elements.Add(U19 = new HCT173("U19", CLK.Net, CLR.Net, L, L, FIn.Net, FIn.Net, new Net(U20.COUT), null, L, L));
            Elements.Add(U22 = new HCT02("U22", netU20S3, netU20S2, netU20S1, netU20S0, netU21S3, netU21S2, netU21S1, netU21S0));
            Elements.Add(U23 = new HCT08("U23", new Net(U22.O1Y), new Net(U22.O2Y), new Net(U22.O3Y), new Net(U22.O4Y), null, null, L, L));
            U23.I3A.ConnectedNet = new Net(U23.O1Y);
            U23.I3B.ConnectedNet = new Net(U23.O2Y);
            U19.D1.ConnectedNet = new Net(U23.O3Y);
            Elements.Add(U17 = new HCT245("U17", H, EOn.Net, netU20S3, netU20S2, netU20S1, netU20S0, netU21S3, netU21S2, netU21S1, netU21S0));
            BUS.AddPins(new Pin[] { U17.B7, U17.B6, U17.B5, U17.B4, U17.B3, U17.B2, U17.B1, U17.B0 });
            Elements.Add(CF = new SignalLabel("CF", new Net(U19.Q0)));
            Elements.Add(ZF = new SignalLabel("ZF", new Net(U19.Q1)));


            // Schematics Page 4 of 11 : RAM
            Elements.Add(ADDR = new SignalBus("ADDR", 4));
            Elements.Add(RI = new SignalLabel("RI", new Net()));
            Elements.Add(ROn = new SignalLabel("ROn", new Net()));
            Elements.Add(PROG = new SignalLabel("PROG", H));
            Elements.Add(RCHP = new RC_HP("RCHP", CLK.Net, 0.01e-6, 1e3));  
            Elements.Add(U31 = new HCT00("U31", new Net(RCHP.Out), RI.Net, L, L, L, L, L, L));
            Elements.Add(U32 = new HCT157("U32", PROG.Net, L, L, L, L, L, H, new Net(U31.O1Y), L, L));
            Elements.Add(U26 = new HCT157("U26", PROG.Net, L, H, BUS[7], H, BUS[6], H, BUS[5], H, BUS[4]));
            Elements.Add(U27 = new HCT157("U27", PROG.Net, L, H, BUS[3], H, BUS[2], H, BUS[1], H, BUS[0]));
            Net netU32O3Y = new Net(U32.O3Y);
            Elements.Add(U24 = new F189("U24", netU32O3Y, L, ADDR[0], ADDR[1], ADDR[2], ADDR[3], new Net(U26.O1Y), new Net(U26.O2Y), new Net(U26.O3Y), new Net(U26.O4Y)));
            Elements.Add(U25 = new F189("U25", netU32O3Y, L, ADDR[0], ADDR[1], ADDR[2], ADDR[3], new Net(U27.O4Y), new Net(U27.O3Y), new Net(U27.O2Y), new Net(U27.O1Y)));
            Elements.Add(U28 = new HCT04("U28", new Net(U24.O0n), new Net(U24.O1n), new Net(U24.O2n), new Net(U24.O3n), L, L));
            Elements.Add(U29 = new HCT04("U29", new Net(U25.O2n), new Net(U25.O1n), new Net(U25.O0n), L,L, new Net(U25.O3n)));
            Elements.Add(new SignalLabel("RAM_WEn", netU32O3Y));

            Elements.Add(U30 = new HCT245("U30", H, ROn.Net, new Net(U28.O1Y), new Net(U28.O2Y), new Net(U28.O3Y), new Net(U28.O4Y), new Net(U29.O6Y), new Net(U29.O1Y), new Net(U29.O2Y), new Net(U29.O3Y)));
            BUS.AddPins(new Pin[] { U30.B7, U30.B6, U30.B5, U30.B4, U30.B3, U30.B2, U30.B1, U30.B0 });


            // Schematics Page 3 of 11 : MAR
            Elements.Add(MIn = new SignalLabel("MIn", new Net()));
            Elements.Add(U34 = new HCT173("U34", CLK.Net, CLR.Net, L, L, MIn.Net, MIn.Net, BUS[3], BUS[2], BUS[1], BUS[0]));
            Elements.Add(U33 = new HCT157("U33", PROG.Net, L, H, new Net(U34.Q0), H, new Net(U34.Q1), H, new Net(U34.Q2), H, new Net(U34.Q3)));
            ADDR.AddPins(new Pin[] { U33.O4Y, U33.O3Y, U33.O2Y, U33.O1Y });

            // Schematics Page 7 of 11 : PC
            Elements.Add(CE = new SignalLabel("CE", new Net()));
            Elements.Add(Jn = new SignalLabel("Jn", new Net()));
            Elements.Add(CLRn = new SignalLabel("CLRn", new Net()));
            Elements.Add(COn = new SignalLabel("COn", new Net()));
            Elements.Add(U35 = new HCT161("U35", CLK.Net, CLRn.Net, Jn.Net, CE.Net, CE.Net, BUS[0], BUS[1], BUS[2], BUS[3]));
            Net netU35Q0 = new Net(U35.Q0);
            Net netU35Q1 = new Net(U35.Q1);
            Net netU35Q2 = new Net(U35.Q2);
            Net netU35Q3 = new Net(U35.Q3);
            Elements.Add(U36 = new HCT245("U36", L, COn.Net, L, L, L, L, netU35Q3, netU35Q2, netU35Q1, netU35Q0, true));
            BUS.AddPins(new Pin[] { U36.A7, U36.A6, U36.A5, U36.A4, U36.A0, U36.A1, U36.A2, U36.A3 });
            Elements.Add(PC = new SignalBus("PC", new Net[] { netU35Q0, netU35Q1, netU35Q2, netU35Q3 }));

            // Schematics Page 10 of 11 : Output
            Elements.Add(OI = new SignalLabel("OI", new Net()));
            Elements.Add(U39 = new LM555("U39", H, H, 5.0, 1e3, 100e3, 0.01e-6));
            Elements.Add(U37 = new HCT76("U37", new Net(U39.Q), H, H, H, H, null, H, H, H, H));
            Net netU37Q1n = new Net(U37.Q1n);
            Net netU37Q2n = new Net(U37.Q2n);
            U37.CLK2.ConnectedNet = netU37Q1n;
            Elements.Add(U38 = new HCT139("U38", L, netU37Q1n, netU37Q2n, L, L, L));
            Elements.Add(U46 = new HCT08("U46", OI.Net, CLK.Net, L, L, L, L, L, L));
            Elements.Add(U44 = new HCT273("U44", new Net(U46.O1Y), CLRn.Net, BUS[0], BUS[1], BUS[2], BUS[3], BUS[4], BUS[5], BUS[6], BUS[7]));
            Elements.Add(U45 = new AT28C16("U45", H, L, L, new Net(U44.O1Q), new Net(U44.O2Q), new Net(U44.O3Q), new Net(U44.O4Q), new Net(U44.O5Q), new Net(U44.O6Q), new Net(U44.O7Q), new Net(U44.O8Q), netU37Q1n, netU37Q2n, L));


            // Schematics Page 2 of 11 : Control Logic
            Elements.Add(U51 = new HCT00("U51", null, null, null, null, netRST, netRST, null, null));
            Net netU51O2Y = new Net(U51.O2Y);
            Net netU51O3Y = new Net(U51.O3Y);
            Net netU51O4Y = new Net(U51.O4Y);
            CLRn.Net.ConnectedPins.Add(U51.O3Y); // = netU51O3Y;
            U51.I4A.ConnectedNet = netU51O3Y;
            U51.I4B.ConnectedNet = netU51O3Y;
            CLR.Net.ConnectedPins.Add(U51.O4Y);// = netU51O4Y;
            U51.I2A.ConnectedNet = netU51O3Y;
            U51.I1A.ConnectedNet = netU51O2Y;
            U51.I1B.ConnectedNet = netU51O2Y;
            Elements.Add(U48 = new HCT161("U48", CLKn.Net, new Net(U51.O1Y), H, H, H, L, L, L, L));
            Net netU48Q0 = new Net(U48.Q0);
            Net netU48Q1 = new Net(U48.Q1);
            Net netU48Q2 = new Net(U48.Q2);
            Elements.Add(U50 = new HCT138("U50", L, L, H, netU48Q0, netU48Q1, netU48Q2));
            U51.I2B.ConnectedNet = new Net(U50.Y5);
            Elements.Add(U47 = new AT28C16("U47", H, L, L, netU48Q0, netU48Q1, netU48Q2, IR[4], IR[5], IR[6], IR[7], L, CF.Net, ZF.Net, L));
            HLT.Net.ConnectedPins.Add(U47.IO7);
            RI.Net.ConnectedPins.Add(U47.IO5);
            Elements.Add(U49 = new HCT04("U49", new Net(U47.IO6), new Net(U47.IO4), new Net(U47.IO3), new Net(U47.IO2), new Net(U47.IO1), new Net(U47.IO0)));
            MIn.Net.ConnectedPins.Add(U49.O1Y);
            ROn.Net.ConnectedPins.Add(U49.O2Y);
            IOn.Net.ConnectedPins.Add(U49.O3Y);
            IIn.Net.ConnectedPins.Add(U49.O4Y);
            AIn.Net.ConnectedPins.Add(U49.O5Y);
            AOn.Net.ConnectedPins.Add(U49.O6Y);

            Elements.Add(U52 = new AT28C16("U52", H, L, L, netU48Q0, netU48Q1, netU48Q2, IR[4], IR[5], IR[6], IR[7], H, CF.Net, ZF.Net, L));
            Elements.Add(U53 = new HCT04("U53", new Net(U52.IO7), new Net(U52.IO5), new Net(U52.IO2), new Net(U52.IO1), new Net(U52.IO0), L));
            EOn.Net.ConnectedPins.Add(U53.O1Y);
             SU.Net.ConnectedPins.Add(U52.IO6);
            BIn.Net.ConnectedPins.Add(U53.O2Y);
             OI.Net.ConnectedPins.Add(U52.IO4);
             CE.Net.ConnectedPins.Add(U52.IO3);
            COn.Net.ConnectedPins.Add(U53.O3Y);
             Jn.Net.ConnectedPins.Add(U53.O4Y);
            FIn.Net.ConnectedPins.Add(U53.O5Y);
            Elements.Add(MCstep = new SignalBus("MCstep", new Net[] { netU48Q0, netU48Q1, netU48Q2 }));
            Elements.Add(Mnemonic = new CustomBus("Mnemonic", new Net[] { IR[0], IR[1], IR[2], IR[3], IR[4], IR[5], IR[6], IR[7]}));
            Mnemonic.CustomConvHandler += DisAssemble;


            // Debug
            //SignalBus RAM_DI;
            //SignalBus RAM_DO;
            //Elements.Add(RAM_DI = new SignalBus("RAM_DI", 8));
            //Elements.Add(RAM_DO = new SignalBus("RAM_DO", 8));
            //RAM_DI.AddPins(new Pin[] { U27.O4Y, U27.O3Y, U27.O2Y, U27.O1Y, U26.O4Y, U26.O3Y, U26.O2Y, U26.O1Y });
            //RAM_DO.AddPins(new Pin[] { U29.O3Y, U29.O2Y, U29.O1Y, U29.O6Y, U28.O4Y, U28.O3Y, U28.O2Y, U28.O1Y });

            //SignalBus AL;
            //Elements.Add(AL = new SignalBus("AL", 4));
            //AL.AddPins(new Pin[] { U34.Q3, U34.Q2, U34.Q1, U34.Q0 });



        }

        public override void LoadRomFile(string FileName)
        {
            U47.LoadContents(FileName);
            U52.LoadContents(FileName);
            ROMfileName = FileName;
        }

        public override void LoadRamFile(string FileName)
        {
            U24.LoadContents(FileName, true, true);
            U25.LoadContents(FileName, false);
            RAMfileName = FileName;
        }

        private void RST_ResetEndEvent(object sender, EventArgs e)
        {
            LoadRamFile(RAMfileName);
        }

        public override void SimulationRestart()
        {
            base.SimulationRestart();
            if ((ROMfileName != null) && (ROMfileName != ""))
                LoadRomFile(ROMfileName);

            if ((RAMfileName != null) && (RAMfileName != ""))
                LoadRamFile(RAMfileName);
        }


        public static string DisAssemble(uint OpCode)
        {
            string s = "";

            uint ir = OpCode >> 4;
            uint x = OpCode & 0xF;
            switch (ir)
            {
                case 0: s = "nop"; break;
                case 1: s = "lda [$" + x.ToString("X1")+"]"; break;
                case 2: s = "add [$" + x.ToString("X1")+"]"; break;
                case 3: s = "sub [$" + x.ToString("X1")+"]"; break;
                case 4: s = "sta [$" + x.ToString("X1")+"]"; break;
                case 5: s = "ldi $" + x.ToString("X1"); break;
                case 6: s = "jmp $" + x.ToString("X1"); break;
                case 7: s = "jc  $" + x.ToString("X1"); break;
                case 8: s = "jz  $" + x.ToString("X1"); break;
                case 9:  s = "?"; break;
                case 10: s = "?"; break;
                case 11: s = "?"; break;
                case 12: s = "?"; break;
                case 13: s = "?"; break;
                case 14: s = "out "; break;
                case 15: s = "halt"; break;
            }
            return s;
        }
    }
}
