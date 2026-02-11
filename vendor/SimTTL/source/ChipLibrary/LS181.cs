// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74LS181.
    /// </summary>
    public class LS181 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn54ls181.pdf

        private const double TYP_PROPAGATION_DELAY = 24;

        #region Private/Protected Fields
        private Pin[] A;
        private Pin[] B;
        private Pin[] S;
        private Pin[] F;
        #endregion Private/Protected Fields

        #region Input Pins
        public Pin CN;

        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;

        public Pin B0;
        public Pin B1;
        public Pin B2;
        public Pin B3;

        public Pin S0;
        public Pin S1;
        public Pin S2;
        public Pin S3;

        public Pin M;
        #endregion Input Pins

        #region Output Pins
        public Pin F0;
        public Pin F1;
        public Pin F2;
        public Pin F3;

        public Pin CN4;
        public Pin AEQB;

        public Pin P;
        public Pin G;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public LS181(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public LS181(string Name, Net NetCN, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetB0, Net NetB1, Net NetB2, Net NetB3, Net NetS0, Net NetS1, Net NetS2, Net NetS3, Net NetM) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "24");
            this.Ground[0] = new Pin(this, "GND", "12");

            this.CN = new Pin(this, "CN", "7", LineMode.In, SignalState.L, NetCN);

            this.A0 = new Pin(this, "A0", "2", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this, "A1", "23", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "21", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "19", LineMode.In, SignalState.L, NetA3);

            this.B0 = new Pin(this, "B0", "1", LineMode.In, SignalState.L, NetB0);
            this.B1 = new Pin(this, "B1", "22", LineMode.In, SignalState.L, NetB1);
            this.B2 = new Pin(this, "B2", "20", LineMode.In, SignalState.L, NetB2);
            this.B3 = new Pin(this, "B3", "18", LineMode.In, SignalState.L, NetB3);

            this.S0 = new Pin(this, "S0", "6", LineMode.In, SignalState.L, NetS0);
            this.S1 = new Pin(this, "S1", "5", LineMode.In, SignalState.L, NetS1);
            this.S2 = new Pin(this, "S2", "4", LineMode.In, SignalState.L, NetS2);
            this.S3 = new Pin(this, "S3", "3", LineMode.In, SignalState.L, NetS3);

            this.M = new Pin(this, "M", "8", LineMode.In, SignalState.L, NetM);

            this.F0 = new Pin(this, "F0", "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.F1 = new Pin(this, "F1", "10", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.F2 = new Pin(this, "F2", "11", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.F3 = new Pin(this, "F3", "13", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            this.CN4 = new Pin(this, "CN4", "16", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.AEQB = new Pin(this, "AEQB", "14", LineMode.OpenDrain, SignalState.L, TYP_PROPAGATION_DELAY);
            this.P = new Pin(this, "P", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.G = new Pin(this, "G", "17", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);


            Inputs = new Pin[5][];
            SetPinArray(Inputs, 0, this.CN);
            SetPinArray(Inputs, 1, this.M);
            A = new Pin[] { this.A0, this.A1, this.A2, this.A3 };
            SetPinArray(Inputs, 2, A);
            B = new Pin[] { this.B0, this.B1, this.B2, this.B3 };
            SetPinArray(Inputs, 3, B);
            S = new Pin[] { this.S0, this.S1, this.S2, this.S3 };
            SetPinArray(Inputs, 4, S);

            Outputs = new Pin[5][];
            SetPinArray(Outputs, 0, this.CN4);
            SetPinArray(Outputs, 1, this.AEQB);
            SetPinArray(Outputs, 2, this.P);
            SetPinArray(Outputs, 3, this.G);
            F = new Pin[] { this.F0, this.F1, this.F2, this.F3 };
            SetPinArray(Outputs, 4, F);

        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            //if ((Name=="U68") && (Time >= 30878))
            //    Debug.WriteLine("");

            base.Update(Time);

            int a = GetValue(A);
            int b = GetValue(B);
            int s = GetValue(S);
            int cin = CN.State == SignalState.H ? 0 : 1;
            int cout = 1;
            int f = 0;

            switch (s)
            {
                case 0:
                    if (M.State == SignalState.L)
                    {
                        f = a + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                        f = a ^ 0xF;
                    break;

                case 1:
                    if (M.State == SignalState.L)
                    {
                        f = (a | b) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = (a | b) ^ 0xF;
                        if (((a | b) & 8) != 0)
                            cout = cin;
                    }
                    break;

                case 2:
                    if (M.State == SignalState.L)
                    {
                        f = (a | (b ^ 0xF)) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = (a ^ 0xF) & b;
                        cout = cin;
                    }
                    break;

                case 3:
                    if (M.State == SignalState.L)
                    {
                        f = -1 + cin;
                        cout = (f >> 4) & 1;
                    }
                    else
                    {
                        f = 0;
                        cout = cin;
                    }
                    break;

                case 4:
                    if (M.State == SignalState.L)
                    {
                        f = a + (a & (b ^ 0xF)) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = (a & b) ^ 0xF;
                        if (((a & 8) > 0) && ((b & 8) == 0))
                            cout = 0;
                    }
                    break;

                case 5:
                    if (M.State == SignalState.L)
                    {
                        f = (a | b) + (a & (b ^ 0xF)) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    { 
                        f = b ^ 0xF;
                    }
                    break;

                case 6:
                    if (M.State == SignalState.L)
                    {
                        f = a - b - (cin ^ 1);
                        cout = (f >> 4) & 1;
                    }
                    else
                    {
                        f = a ^ b;
                        if (((a & 8) > 0) && ((b & 8) > 0))
                            cout = cin;
                    }
                    break;

                case 7:
                    if (M.State == SignalState.L)
                    {
                        f = (a & (b ^ 0xF)) - (cin ^ 1);
                        cout = (f >> 4) & 1;
                    }
                    else
                    {
                        f = a & (b ^ 0xF);
                        cout = cin;
                    }
                    break;

                case 8:
                    if (M.State == SignalState.L)
                    {
                        f = a + (a & b) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = (a ^ 0xF) | b;
                        if ((a & b & 8) > 0)
                            cout = 0;
                    }
                    break;

                case 9:
                    if (M.State == SignalState.L)
                    {
                        f = a + b + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = (a ^ b) ^ 0xF;
                        if ((a & b & 8) > 0)
                            cout = 0;
                    }
                    break;

                case 10:
                    if (M.State == SignalState.L)
                    {
                        f = (a | (b ^ 0xF)) + (a & b) + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = b;
                        if ((a & b & 8) > 0)
                            cout = 0;
                    }
                    break;

                case 11:
                    if (M.State == SignalState.L)
                    {
                        f = (a & b) - (cin ^ 1);
                        cout = (f >> 4) & 1;
                    }
                    else
                    {
                        f = a & b;
                        cout = cin;
                    }
                    break;

                case 12:
                    if (M.State == SignalState.L)
                    {
                        f = a + a + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = 1;
                        if ((a & 8) > 0)
                            cout = 0;
                    }
                    break;

                case 13:
                    if (M.State == SignalState.L)
                    {
                        f = (a | b) + a + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = a | (b ^ 0xF);
                        if ((a & 8) > 0)
                            cout = 0;
                    }
                    break;

                case 14:
                    if (M.State == SignalState.L)
                    {
                        f = (a | (b ^ 0xF)) + a + cin;
                        cout = ((f >> 4) & 1) ^ 1;
                    }
                    else
                    {
                        f = a | b;
                        cout = cin;
                    }
                    break;

                case 15:
                    if (M.State == SignalState.L)
                    {
                        f = a - (cin ^ 1);
                        cout = (f >> 4) & 1;
                    }
                    else
                    {
                        f = a;
                        cout = cin;
                    }
                    break;
            }

            if (cout == 0)
                CN4.NewOutState = SignalState.L;
            else
                CN4.NewOutState = SignalState.H;

            if ((f & 0xF) == 0xF)
                AEQB.NewOutState = SignalState.H;
            else
                AEQB.NewOutState = SignalState.L;

            for (int i = 0; i < F.Length; i++)
            {
                if ((f & 1) == 0)
                    F[i].NewOutState = SignalState.L;
                else
                    F[i].NewOutState = SignalState.H;

                f >>= 1;
            }

        }
        #endregion Public Methods

    }
}

