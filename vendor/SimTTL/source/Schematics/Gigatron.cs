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
using System.IO;

namespace Schematics
{
    public class Gigatron:BaseSchematics
    {
        public const string SCHEMATICS_NAME = "Gigatron";


        // Schematics Page 2 of 8
        private ClockGenerator CG;
        private ResetGenerator RST;
        private HCT04 U1;
        private RC_LP RCLP;
        private SignalLabel CLK1;
        private SignalLabel CLK2;

        // Schematics Page 3 of 8
        private SignalLabel PLn;
        private SignalLabel PHn;
        private SignalLabel DEn;
        private SignalBus BUS;
        private SignalBus X;
        private SignalBus Y;
        private HCT161 U3;
        private HCT161 U4;
        private HCT161 U5;
        private HCT161 U6;
        private SignalBus PC;
        private AT27C1024 U7;
        private HCT273 U8;
        private HCT273 U9;
        private HCT244 U10;
        private SignalBus IR;
        private SignalBus D;

        // Schematics Page 4 of 8
        private SignalBus AC;
        private SignalLabel JUMPn;
        private SignalLabel CO;
        private SignalLabel BFn;
        private HCT139 U11;
        private SignalLabel OEn;
        private SignalLabel AEn;
        private SignalLabel IEn;
        private HCT153 U12;
        private HCT138 U13;
        private HCT138 U14;
        private HCT240 U15;
        private DiodeAND DA13_1;
        private DiodeAND DA13_2;
        private DiodeAND DA13_3;
        private DiodeAND DA13_4;
        private DiodeAND DA14_0;
        private DiodeAND DA14_1;
        private DiodeAND DA14_2;
        private DiodeAND DA14_3;
        private DiodeAND DA14_4;
        private SignalBus AR;
        private HCT32 U16;
        private SignalLabel XLn;
        private SignalLabel YLn;
        private SignalLabel IX;
        private SignalLabel EHn;
        private SignalLabel ELn;
        private SignalLabel OLn;
        private SignalLabel LDn;
        private DiodeAND DA15_16;
        private SignalLabel WEn;
        private SignalLabel AL;
        private SignalLabel INV_A_OUT;
        private SignalLabel INV_B_OUT;
        private SignalLabel INV_C_OUT;


        // Schematics Page 5 of 8
        private HCT157 U32;
        private HCT157 U33;
        private HCT157 U34;
        private HCT157 U35;
        private SignalBus A;
        private HM62256 U36;

        // Schematics Page 6 of 8
        private HCT153 U17;
        private HCT153 U18;
        private HCT153 U19;
        private HCT153 U20;
        private HCT153 U21;
        private HCT153 U22;
        private HCT153 U23;
        private HCT153 U24;
        private HCT283 U25;
        private HCT283 U26;
        private SignalBus ALU;
        private SignalBus ADD_A;
        private SignalBus ADD_B;

        // Schematics Page 7 of 8
        private HCT377 U27;
        private HCT244 U28;
        private HCT161 U29;
        private HCT161 U30;
        private HCT377 U31;
        private HCT377 U37;
        private SignalBus OUT;


        private SignalBus OpCode;
        private CustomBus Mnemonic;
        private SignalBus U10Bus;


        public Gigatron() : base(SCHEMATICS_NAME)
        {
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;

            Elements.Add(RST = new ResetGenerator("RST", 1000));
            Net netRST = new Net(RST.Out);
            Net netRSTn = new Net(RST.Outn);
            //RST.ResetEndEvent += RST_ResetEndEvent;

            // Schematics Page 2 of 8
            Elements.Add(CG = new ClockGenerator("CG", SignalState.L, 80, 0));
            Elements.Add(U1 = new HCT04("U1", new Net(CG.Out), null, null, null, null, null));
            U1.I6A.ConnectedNet = new Net(U1.O1Y);
            Net netU1O6Y = new Net(U1.O6Y);
            U1.I2A.ConnectedNet = netU1O6Y;
            Net netU1O2Y = new Net(U1.O2Y);
            U1.I3A.ConnectedNet = netU1O2Y;
            Elements.Add(RCLP = new RC_LP("RCLP", new Net(U1.O3Y), 150, 150, 47e-12));
            U1.I4A.ConnectedNet = new Net(RCLP.Out);
            U1.I5A.ConnectedNet = new Net(U1.O6Y);

            Elements.Add(CLK1 = new SignalLabel("CLK1", netU1O2Y));
            Elements.Add(CLK2 = new SignalLabel("CLK2", new Net(U1.O4Y)));

            // Schematics Page 3 of 8
            Elements.Add(PLn = new SignalLabel("PLn", new Net()));
            Elements.Add(PHn = new SignalLabel("PHn", new Net()));
            Elements.Add(DEn = new SignalLabel("DEn", new Net()));
            Elements.Add(BUS = new SignalBus("BUS", 8));
            Elements.Add(X = new SignalBus("X", 8));
            Elements.Add(Y = new SignalBus("Y", 8));

            Elements.Add(U3 = new HCT161("U3", CLK1.Net, netRSTn, PLn.Net, H, H, BUS[0], BUS[1], BUS[2], BUS[3]));
            Elements.Add(U4 = new HCT161("U4", CLK1.Net, netRSTn, PLn.Net, H, new Net(U3.TC), BUS[4], BUS[5], BUS[6], BUS[7]));
            Elements.Add(U5 = new HCT161("U5", CLK1.Net, netRSTn, PHn.Net, PLn.Net, new Net(U4.TC), Y[0], Y[1], Y[2], Y[3]));
            Elements.Add(U6 = new HCT161("U6", CLK1.Net, netRSTn, PHn.Net, PLn.Net, new Net(U5.TC), Y[4], Y[5], Y[6], Y[7]));
            Elements.Add(PC = new SignalBus("PC", new Net[] { new Net(U3.Q0), new Net(U3.Q1), new Net(U3.Q2), new Net(U3.Q3), new Net(U4.Q0), new Net(U4.Q1), new Net(U4.Q2), new Net(U4.Q3), new Net(U5.Q0), new Net(U5.Q1), new Net(U5.Q2), new Net(U5.Q3), new Net(U6.Q0), new Net(U6.Q1), new Net(U6.Q2), new Net(U6.Q3) }));

            Elements.Add(U7 = new AT27C1024("U7", H, L, L, PC[0], PC[1], PC[2], PC[3], PC[4], PC[5], PC[6], PC[7], PC[8], PC[9], PC[10], PC[11], PC[12], PC[13], PC[14], PC[15]));
            Elements.Add(U8 = new HCT273("U8", CLK1.Net, H, new Net(U7.DQ7), new Net(U7.DQ4), new Net(U7.DQ3), new Net(U7.DQ0), new Net(U7.DQ1), new Net(U7.DQ2), new Net(U7.DQ5), new Net(U7.DQ6)));
            Elements.Add(U9 = new HCT273("U9", CLK1.Net, H, new Net(U7.DQ15), new Net(U7.DQ13), new Net(U7.DQ11), new Net(U7.DQ9), new Net(U7.DQ8), new Net(U7.DQ10), new Net(U7.DQ12), new Net(U7.DQ14)));
            Net netU9O5Q = new Net(U9.O5Q);
            Net netU9O4Q = new Net(U9.O4Q);
            Net netU9O6Q = new Net(U9.O6Q);
            Net netU9O3Q = new Net(U9.O3Q);
            Net netU9O7Q = new Net(U9.O7Q);
            Net netU9O2Q = new Net(U9.O2Q);
            Net netU9O8Q = new Net(U9.O8Q);
            Net netU9O1Q = new Net(U9.O1Q);
            Net netU8O4Q = new Net(U8.O4Q);
            Net netU8O5Q = new Net(U8.O5Q);
            Net netU8O6Q = new Net(U8.O6Q);
            Net netU8O3Q = new Net(U8.O3Q);
            Net netU8O2Q = new Net(U8.O2Q);
            Net netU8O7Q = new Net(U8.O7Q);
            Net netU8O8Q = new Net(U8.O8Q);
            Net netU8O1Q = new Net(U8.O1Q);
            Elements.Add(IR = new SignalBus("IR", new Net[] { netU8O4Q, netU8O5Q, netU8O6Q, netU8O3Q, netU8O2Q, netU8O7Q, netU8O8Q, netU8O1Q }));
            Elements.Add(D  = new SignalBus("D", new Net[]  { netU9O5Q, netU9O4Q, netU9O6Q, netU9O3Q, netU9O7Q, netU9O2Q, netU9O8Q, netU9O1Q }));
            Elements.Add(U10 = new HCT244("U10", DEn.Net, D[6], D[7], D[5], D[3], DEn.Net, D[1], D[0], D[2], D[4]));
            BUS.AddPins(new Pin[] { U10.O2Y1, U10.O2Y0, U10.O2Y2, U10.O1Y3, U10.O2Y3, U10.O1Y2, U10.O1Y0, U10.O1Y1 });

            // Schematics Page 4 of 8
            Elements.Add(AC = new SignalBus("AC", 8));
            Elements.Add(JUMPn = new SignalLabel("JUMPn", null));
            Elements.Add(CO = new SignalLabel("CO", new Net()));
            Elements.Add(BFn = new SignalLabel("BF", new Net()));
            Elements.Add(U11 = new HCT139("U11", L, IR[0], IR[1], IR[4], IR[3], IR[2]));
            DEn.Net.ConnectedPins.Add(U11.O1Y0);
            Elements.Add(OEn = new SignalLabel("OEn", new Net(U11.O1Y1)));
            Elements.Add(AEn = new SignalLabel("AEn", new Net(U11.O1Y2)));
            Elements.Add(IEn = new SignalLabel("IEn", new Net(U11.O1Y3)));
            BFn.Net.ConnectedPins.Add(U11.O2Y3);
            Elements.Add(U14 = new HCT138("U14", L, L, H, IR[5], IR[6], IR[7]));
            Net netU14Y0 = new Net(U14.Y0);
            Net netU14Y1 = new Net(U14.Y1);
            Net netU14Y2 = new Net(U14.Y2);
            Net netU14Y3 = new Net(U14.Y3);
            Net netU14Y4 = new Net(U14.Y4);
            Net netU14Y5 = new Net(U14.Y5);
            Net netU14Y6 = new Net(U14.Y6);
            Net netU14Y7 = new Net(U14.Y7);
            JUMPn.Net = netU14Y7;
            Elements.Add(DA14_0 = new DiodeAND("DA14_0", new Net[] { IR[7], netU14Y7 }));
            Elements.Add(DA14_1 = new DiodeAND("DA14_1", new Net[] { netU14Y5, netU14Y7 }));
            Elements.Add(DA14_2 = new DiodeAND("DA14_2", new Net[] { netU14Y2, netU14Y3, netU14Y5 }));
            Elements.Add(DA14_3 = new DiodeAND("DA14_3", new Net[] { netU14Y0, netU14Y2, netU14Y3, netU14Y4, netU14Y7 }));
            Elements.Add(DA14_4 = new DiodeAND("DA14_4", new Net[] { netU14Y0, netU14Y1, netU14Y2, netU14Y4 }));
            Elements.Add(U12 = new HCT153("U12", AC[7], CO.Net, JUMPn.Net, IR[2], IR[3], IR[4], L, H, H, H, H, H));
            Elements.Add(U13 = new HCT138("U13", L, L, JUMPn.Net, IR[2], IR[3], IR[4]));
            Net netU13Y0 = new Net(U13.Y0);
            Net netU13Y1 = new Net(U13.Y1);
            Net netU13Y2 = new Net(U13.Y2);
            Net netU13Y3 = new Net(U13.Y3);
            Net netU13Y4 = new Net(U13.Y4);
            Net netU13Y5 = new Net(U13.Y5);
            Net netU13Y6 = new Net(U13.Y6);
            Net netU13Y7 = new Net(U13.Y7);
            Elements.Add(DA13_1 = new DiodeAND("DA13_1", new Net[] { netU13Y0, netU13Y1, netU13Y2, netU13Y3 }));
            Elements.Add(DA13_2 = new DiodeAND("DA13_2", new Net[] { netU13Y6, netU13Y7 }));
            Elements.Add(DA13_3 = new DiodeAND("DA13_3", new Net[] { netU13Y1, netU13Y3, netU13Y7 }));
            Elements.Add(DA13_4 = new DiodeAND("DA13_4", new Net[] { netU13Y2, netU13Y3, netU13Y7 }));
            Elements.Add(U15 = new HCT240("U15", L, new Net(U12.O1Y), netU14Y6, new Net(DA14_3.Out), new Net(DA14_1.Out), L, new Net(DA14_0.Out), new Net(DA14_2.Out), netU13Y7, new Net(DA14_4.Out)));
            Elements.Add(AR = new SignalBus("AR", 4));
            AR[0].ConnectedPins.Add(U15.O1Y3);
            AR[1].ConnectedPins.Add(U15.O2Y1);
            AR[2].ConnectedPins.Add(U15.O1Y2);
            AR[3].ConnectedPins.Add(U15.O2Y3);
            Elements.Add(AL = new SignalLabel("AL", new Net(U15.O2Y0)));
            Elements.Add(INV_A_OUT = new SignalLabel("INV_A_OUT", new Net(U15.O2Y2)));
            Elements.Add(INV_B_OUT = new SignalLabel("INV_B_OUT", new Net(U15.O1Y1)));
            Elements.Add(INV_C_OUT = new SignalLabel("INV_C_OUT", new Net(U15.O1Y0)));
            Elements.Add(U16 = new HCT32("U16", CLK1.Net, netU14Y6, new Net(DA13_2.Out), INV_B_OUT.Net, new Net(DA13_1.Out), INV_B_OUT.Net, new Net(U11.O2Y0), netU14Y7));
            Elements.Add(XLn = new SignalLabel("XLn", netU13Y4));
            Elements.Add(YLn = new SignalLabel("YLn", netU13Y5));
            Elements.Add(IX = new SignalLabel("IX",   INV_A_OUT.Net));
            Elements.Add(EHn = new SignalLabel("EHn", new Net(DA13_4.Out)));
            Elements.Add(ELn = new SignalLabel("ELn", new Net(DA13_3.Out)));
            Elements.Add(OLn = new SignalLabel("OLn", new Net(U16.O2Y)));
            Elements.Add(LDn = new SignalLabel("LDn", new Net(U16.O3Y)));
            PHn.Net.ConnectedPins.Add(U16.O4Y);
            Elements.Add(DA15_16 = new DiodeAND("DA15_16", new Net[] { INV_C_OUT.Net, PHn.Net }));
            PLn.Net.ConnectedPins.Add(DA15_16.Out);
            Elements.Add(WEn = new SignalLabel("WEn", new Net(U16.O1Y)));


            // Schematics Page 5 of 8
            Elements.Add(U32 = new HCT157("U32", L, EHn.Net, Y[0], H, Y[7], H, Y[2], H, Y[4], H));
            Elements.Add(U33 = new HCT157("U33", L, EHn.Net, Y[5], H, Y[6], H, Y[3], H, Y[1], H));
            Elements.Add(U34 = new HCT157("U34", ELn.Net, L, X[1], D[1], X[2], D[2], X[3], D[3], X[0], D[0]));
            Elements.Add(U35 = new HCT157("U35", ELn.Net, L, X[4], D[4], X[5], D[5], X[6], D[6], X[7], D[7]));
            Elements.Add(A = new SignalBus("A", new Net[] { new Net(U34.O4Y), new Net(U34.O1Y), new Net(U34.O2Y), new Net(U34.O3Y), new Net(U35.O1Y), new Net(U35.O2Y), new Net(U35.O3Y), new Net(U35.O4Y), new Net(U32.O1Y), new Net(U33.O4Y), new Net(U32.O3Y), new Net(U33.O3Y), new Net(U32.O4Y), new Net(U33.O1Y), new Net(U33.O2Y) }));
            Elements.Add(U36 = new HM62256("U36", WEn.Net, L, OEn.Net, A[0], A[1], A[2], A[3], A[4], A[5], A[6], A[7], A[8], A[9], A[10], A[11], A[12], A[13], A[14], BUS[0], BUS[1], BUS[2], BUS[3], BUS[4], BUS[5], BUS[6], BUS[7]));
            BUS.AddPins(new Pin[] { U36.IO0, U36.IO1, U36.IO2, U36.IO3, U36.IO4, U36.IO5, U36.IO6, U36.IO7 });

            // Schematics Page 6 of 8
            Elements.Add(U17 = new HCT153("U17", BUS[4], AC[4], AL.Net, L, L, H, H, L, AR[0], AR[2], AR[1], AR[3]));
            Elements.Add(U18 = new HCT153("U18", BUS[5], AC[5], AL.Net, L, L, H, H, L, AR[0], AR[2], AR[1], AR[3]));
            Elements.Add(U19 = new HCT153("U19", BUS[6], AC[6], AL.Net, L, L, H, H, L, AR[0], AR[2], AR[1], AR[3]));
            Elements.Add(U20 = new HCT153("U20", BUS[7], AC[7], AL.Net, L, L, H, H, L, AR[0], AR[2], AR[1], AR[3]));
            Elements.Add(U21 = new HCT153("U21", AC[0], BUS[0], L, AR[0], AR[1], AR[2], AR[3], AL.Net, L, H, L, H));
            Elements.Add(U22 = new HCT153("U22", AC[1], BUS[1], L, AR[0], AR[1], AR[2], AR[3], AL.Net, L, H, L, H));
            Elements.Add(U23 = new HCT153("U23", AC[2], BUS[2], L, AR[0], AR[1], AR[2], AR[3], AL.Net, L, H, L, H));
            Elements.Add(U24 = new HCT153("U24", AC[3], BUS[3], L, AR[0], AR[1], AR[2], AR[3], AL.Net, L, H, L, H));
            Elements.Add(ADD_A = new SignalBus("ADD_A", 8));
            Elements.Add(ADD_B = new SignalBus("ADD_B", 8));
            ADD_A.AddPins(new Pin[] { U21.O1Y, U22.O1Y, U23.O1Y, U24.O1Y, U17.O1Y, U18.O1Y, U19.O1Y, U20.O1Y });
            ADD_B.AddPins(new Pin[] { U21.O2Y, U22.O2Y, U23.O2Y, U24.O2Y, U17.O2Y, U18.O2Y, U19.O2Y, U20.O2Y });
            Elements.Add(U26 = new HCT283("U26", AR[0], ADD_A[0], ADD_A[1], ADD_A[2], ADD_A[3], ADD_B[0], ADD_B[1], ADD_B[2], ADD_B[3]));
            Elements.Add(U25 = new HCT283("U25", new Net(U26.COUT), ADD_A[4], ADD_A[5], ADD_A[6], ADD_A[7], ADD_B[4], ADD_B[5], ADD_B[6], ADD_B[7]));
            CO.Net.ConnectedPins.Add(U25.COUT);
            Elements.Add(ALU = new SignalBus("ALU", new Net[] { new Net(U26.S0), new Net(U26.S1), new Net(U26.S2), new Net(U26.S3), new Net(U25.S0), new Net(U25.S1), new Net(U25.S2), new Net(U25.S3) }));

            // Schematics Page 7 of 8
            Elements.Add(U27 = new HCT377("U27", CLK2.Net, LDn.Net, ALU[3], ALU[2], ALU[1], ALU[0], ALU[5], ALU[4], ALU[7], ALU[6]));
            AC.AddPins(new Pin[] { U27.O4Q, U27.O3Q, U27.O2Q, U27.O1Q, U27.O6Q, U27.O5Q, U27.O8Q, U27.O7Q });
            Elements.Add(U28 = new HCT244("U28", AEn.Net, AC[0], AC[1], AC[2], AC[3], AEn.Net, AC[7], AC[6], AC[5], AC[4]));
            BUS.AddPins(new Pin[] { U28.O1Y0, U28.O1Y1, U28.O1Y2, U28.O1Y3, U28.O2Y3, U28.O2Y2, U28.O2Y1, U28.O2Y0 });
            Elements.Add(U29 = new HCT161("U29", CLK2.Net, H, XLn.Net, IX.Net, H, ALU[0], ALU[1], ALU[2], ALU[3]));
            Elements.Add(U30 = new HCT161("U30", CLK2.Net, H, XLn.Net, IX.Net, new Net(U29.TC), ALU[4], ALU[5], ALU[6], ALU[7]));
            X.AddPins(new Pin[] { U29.Q0, U29.Q1, U29.Q2, U29.Q3, U30.Q0, U30.Q1, U30.Q2, U30.Q3 });
            Elements.Add(U31 = new HCT377("U31", CLK2.Net, YLn.Net, ALU[0], ALU[1], ALU[2], ALU[3], ALU[7], ALU[6], ALU[5], ALU[4]));
            Y.AddPins(new Pin[] { U31.O1Q, U31.O2Q, U31.O3Q, U31.O4Q, U31.O8Q, U31.O7Q, U31.O6Q, U31.O5Q, });
            Elements.Add(U37 = new HCT377("U37", CLK2.Net, OLn.Net, ALU[3], ALU[2], ALU[1], ALU[0], ALU[4], ALU[5], ALU[6], ALU[7]));
            Elements.Add(OUT = new SignalBus("OUT", 8));
            OUT.AddPins(new Pin[] { U37.O4Q, U37.O3Q, U37.O2Q, U37.O1Q, U37.O5Q, U37.O6Q, U37.O7Q, U37.O8Q });


            Elements.Add(OpCode = new SignalBus("OpCode",     new Net[] { netU9O5Q, netU9O4Q, netU9O6Q, netU9O3Q, netU9O7Q, netU9O2Q, netU9O8Q, netU9O1Q, netU8O4Q, netU8O5Q, netU8O6Q, netU8O3Q, netU8O2Q, netU8O7Q, netU8O8Q, netU8O1Q }));
            Elements.Add(Mnemonic = new CustomBus("Mnemonic", new Net[] { netU9O5Q, netU9O4Q, netU9O6Q, netU9O3Q, netU9O7Q, netU9O2Q, netU9O8Q, netU9O1Q, netU8O4Q, netU8O5Q, netU8O6Q, netU8O3Q, netU8O2Q, netU8O7Q, netU8O8Q, netU8O1Q }));
            Mnemonic.CustomConvHandler += DisAssemble;


            //WriteOpCodes();


        }

        private void WriteOpCodes()
        {
            StreamWriter sw = new StreamWriter("C:\\Users\\stefa\\source\\repos\\SimTTL\\SimTTL\\bin\\Debug\\opcodes.prn");
            for (int i = 0; i < 256; i++)
                sw.WriteLine(i.ToString("X2") + "\t" + (i >> 5).ToString() + "\t" + ((i >> 2) & 7).ToString() + "\t" + (i & 3).ToString() + "\t" + DisAssemble( (uint)(i | (0xAA << 8))  ));
            sw.Close();
        }

        /// <summary>
        /// A generic method to load a binary file into the ROM of a schematics.
        /// </summary>
        /// <param name="FileName">Full file name of the binary to load into the ROM.</param>
        public override void LoadRomFile(string FileName)
        {
            U7.LoadContents(FileName);
        }


        public static string Bus2Str(uint bus, uint data)
        {
            string s = "";
            switch (bus)
            {
                case 0:
                    s = "$"+data.ToString("x2");
                    break;

                case 1:
                    s = "[$" + data.ToString("x2")+"]";
                    break;

                case 2:
                    s = "ac";
                    break;

                case 3:
                    s = "in";
                    break;

            }
            return s;
        }


        public static string Mode2StrA(uint mode, uint bus, uint data)
        {
            string s = " ";

            switch (mode)
            {
                case 0:
                    s += Bus2Str(bus, data);
                    break;

                case 1:
                    if (bus == 1)
                        s += "[x]";
                    else
                        s += "???";
                    break;

                case 2:
                    if (bus == 1)
                        s += "[y,$" + data.ToString("x2") + "]";
                    else
                        s += "???";
                    break;

                case 3:
                    if (bus == 1)
                        s += "[y,x]";
                    else
                        s += "???";
                    break;

                case 4:
                    if (bus != 3)
                        s += Bus2Str(bus, data) + ",x";
                    else
                        s += "???";
                    break;

                case 5:
                    if (bus != 3)
                        s += Bus2Str(bus, data) + ",y";
                    else
                        s += "???";
                    break;

                case 6:
                    if (bus <= 2)
                        s += Bus2Str(bus, data) + ",out";
                    else
                        s += "???";
                    break;

                case 7:
                    if (bus == 1)
                        s += "[y,x++],out";
                    else
                        s += "???";
                    break;

            }
            return s;
        }


        public static string Mode2StrB(uint mode, uint bus, uint data)
        {
            string s = " ";

            switch (mode)
            {
                case 0:
                    switch (bus)
                    {
                        case 0: s += "$" + data.ToString("x2") + ",[$" + data.ToString("x2") + "]"; break;
                        case 1: s += "???"; break;
                        case 2: s += "[$" + data.ToString("x2") + "]"; break;
                        case 3: s += "in,[$" + data.ToString("x2") + "]"; break;
                    }
                    break;

                case 1:
                    if (bus == 2)
                        s += "[x]";
                    else
                        s += "???";
                    break;

                case 2:
                    if (bus != 1)
                        s += "[y,$" + data.ToString("x2") + "]";
                    else
                        s += "???";
                    break;

                case 3:
                    if (bus == 2)
                        s += "[y,x]";
                    else
                        s += "???";
                    break;

                case 4:
                    if (bus != 2)
                        s += "[$" + data.ToString("x2") + "],x";
                    else
                        s += "???";
                    break;

                case 5:
                    if (bus != 1)
                        s += "[$" + data.ToString("x2") + "],y";
                    else
                       s += "???";
                    break;

                case 6:
                    switch (bus)
                    {
                        case 0: s += "$" + data.ToString("x2") + ",[$" + data.ToString("x2") + "]"; break;
                        case 1: s += "???"; break;
                        case 2: s += "[$" + data.ToString("x2") + "]"; break;
                        case 3: s += "in,[$" + data.ToString("x2") + "]"; break;
                    }
                    break;

                case 7:
                    switch (bus)
                    {
                        case 0: s += "$" + data.ToString("x2") + ",[y,x++]"; break;
                        case 1: s += "???"; break;
                        case 2: s += "[y,x++]"; break;
                        case 3: s += "???"; break;
                    }
                    break;

            }
            return s;
        }


        public static string DisAssemble(uint OpCode)
        {
            string s = "";

            uint ir = (OpCode >> 8) & 0xFF; 
            uint data = OpCode & 0xFF;
            uint operation = ir >> 5;
            uint mode = (ir >> 2) & 7;
            uint bus = (ir & 3);

            switch (operation)
            {
                case 0:
                    if (ir == 2)
                        s = "nop";
                    else
                        s = "ld"+ Mode2StrA(mode, bus, data); 
                    break;

                case 1: 
                    s = "and" + Mode2StrA(mode, bus, data); ;
                    break;

                case 2: 
                    s = "or" + Mode2StrA(mode, bus, data); ;
                    break;

                case 3: 
                    s = "xor" + Mode2StrA(mode, bus, data); ;
                    break;

                case 4: 
                    s = "add" + Mode2StrA(mode, bus, data); ;
                    break;

                case 5: s = "sub" + Mode2StrA(mode, bus, data); 
                    break;

                case 6: 
                    if (bus == 1)
                        s = "ctrl $"+data.ToString("x2");
                    else
                        s = "st"+Mode2StrB(mode, bus, data);
                    break;

                case 7:
                    switch (mode)
                    {
                        case 0: s = "jmp y," + Bus2Str(bus, data); break;
                        case 1: s = "bgt " + Bus2Str(bus, data); break;
                        case 2: s = "blt " + Bus2Str(bus, data); break;
                        case 3: s = "bne " + Bus2Str(bus, data); break;
                        case 4: s = "beq " + Bus2Str(bus, data); break;
                        case 5: s = "bge " + Bus2Str(bus, data); break;
                        case 6: s = "ble " + Bus2Str(bus, data); break;
                        case 7: s = "bra " + Bus2Str(bus, data); break;
                    }
                    break;
            }
            return s;
        }

    }
}
