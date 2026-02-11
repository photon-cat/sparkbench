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
    /// Class definition of the logic chip 74HCT245.
    /// </summary>
    public class HCT245 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct245.pdf

        private const double TYP_PROPAGATION_DELAY = 14;

        #region Private/Protected Fields
        private Pin[] portA;
        private Pin[] portB;
        #endregion Private/Protected Fields

        #region Control Pins
        public Pin DIR;
        public Pin OEn;
        #endregion Control Pins

        #region Port A Pins
        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;
        public Pin A4;
        public Pin A5;
        public Pin A6;
        public Pin A7;
        #endregion Port A Pins

        #region Port B Pins
        public Pin B0;
        public Pin B1;
        public Pin B2;
        public Pin B3;
        public Pin B4;
        public Pin B5;
        public Pin B6;
        public Pin B7;
        #endregion Port B Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT245(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT245(string Name, Net NetDIR, Net NetOEn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7) : base(Name)
        {
            this.Power[0] = new Pin(this,  "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.DIR = new Pin(this, "DIR", "1", LineMode.In, SignalState.L,  NetDIR);
            this.OEn = new Pin(this, "OEn", "19", LineMode.In, SignalState.L, NetOEn);
                                                                     
            this.A0 = new Pin(this, "A0", "2", LineMode.BiDir, SignalState.L, NetA0);
            this.A1 = new Pin(this, "A1", "3", LineMode.BiDir, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "4", LineMode.BiDir, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "5", LineMode.BiDir, SignalState.L, NetA3);
            this.A4 = new Pin(this, "A4", "6", LineMode.BiDir, SignalState.L, NetA4);
            this.A5 = new Pin(this, "A5", "7", LineMode.BiDir, SignalState.L, NetA5);
            this.A6 = new Pin(this, "A6", "8", LineMode.BiDir, SignalState.L, NetA6);
            this.A7 = new Pin(this, "A7", "9", LineMode.BiDir, SignalState.L, NetA7);

            this.B0 = new Pin(this, "B0", "18", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B1 = new Pin(this, "B1", "17", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B2 = new Pin(this, "B2", "16", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B3 = new Pin(this, "B3", "15", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B4 = new Pin(this, "B4", "14", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B5 = new Pin(this, "B5", "13", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B6 = new Pin(this, "B6", "12", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);
            this.B7 = new Pin(this, "B7", "11", LineMode.BiDir, SignalState.Z, TYP_PROPAGATION_DELAY);

            portA = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7 };
            portB = new Pin[] { this.B0, this.B1, this.B2, this.B3, this.B4, this.B5, this.B6, this.B7 };

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.DIR);
            SetPinArray(Inputs, 1, this.OEn);
            //SetPinArray(Inputs, 2, portA);
            Inputs[2] = portA;

            Outputs = new Pin[1][];
            //SetPinArray(Outputs, 0, portB);
            Outputs[0] = portB;

            SimulationRestart();
        }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT245(string Name, Net NetDIR, Net NetOEn, Net NetB0, Net NetB1, Net NetB2, Net NetB3, Net NetB4, Net NetB5, Net NetB6, Net NetB7, bool InitB2A) : base(Name)
        {
            this.DIR = new Pin(this, "DIR", "1", LineMode.In, SignalState.L, NetDIR);
            this.OEn = new Pin(this, "OEn", "19", LineMode.In, SignalState.L, NetOEn);

            this.B0 = new Pin(this, "B0", "18", LineMode.BiDir, SignalState.Z, NetB0);
            this.B1 = new Pin(this, "B1", "17", LineMode.BiDir, SignalState.Z, NetB1);
            this.B2 = new Pin(this, "B2", "16", LineMode.BiDir, SignalState.Z, NetB2);
            this.B3 = new Pin(this, "B3", "15", LineMode.BiDir, SignalState.Z, NetB3);
            this.B4 = new Pin(this, "B4", "14", LineMode.BiDir, SignalState.Z, NetB4);
            this.B5 = new Pin(this, "B5", "13", LineMode.BiDir, SignalState.Z, NetB5);
            this.B6 = new Pin(this, "B6", "12", LineMode.BiDir, SignalState.Z, NetB6);
            this.B7 = new Pin(this, "B7", "11", LineMode.BiDir, SignalState.Z, NetB7);

            this.A0 = new Pin(this, "A0", "2", LineMode.BiDir, SignalState.Z, 35);
            this.A1 = new Pin(this, "A1", "3", LineMode.BiDir, SignalState.Z, 35);
            this.A2 = new Pin(this, "A2", "4", LineMode.BiDir, SignalState.Z, 35);
            this.A3 = new Pin(this, "A3", "5", LineMode.BiDir, SignalState.Z, 35);
            this.A4 = new Pin(this, "A4", "6", LineMode.BiDir, SignalState.Z, 35);
            this.A5 = new Pin(this, "A5", "7", LineMode.BiDir, SignalState.Z, 35);
            this.A6 = new Pin(this, "A6", "8", LineMode.BiDir, SignalState.Z, 35);
            this.A7 = new Pin(this, "A7", "9", LineMode.BiDir, SignalState.Z, 35);

            portA = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7 };
            portB = new Pin[] { this.B0, this.B1, this.B2, this.B3, this.B4, this.B5, this.B6, this.B7 };

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.DIR);
            SetPinArray(Inputs, 1, this.OEn);
            Inputs[2] = portB;

            Outputs = new Pin[1][];
            Outputs[0] = portA;

            SimulationRestart();
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if (DIR.State == SignalState.H)
            {
                if (Inputs[2] != portA)
                {
                    for (int i = 0; i < portA.Length; i++)
                        portA[i].DeactivateDriver();

                    Inputs[2] = portA;
                    Outputs[0] = portB;
                }

                if (OEn.State == SignalState.L)
                {
                    B0.NewOutState = A0.State;
                    B1.NewOutState = A1.State;
                    B2.NewOutState = A2.State;
                    B3.NewOutState = A3.State;
                    B4.NewOutState = A4.State;
                    B5.NewOutState = A5.State;
                    B6.NewOutState = A6.State;
                    B7.NewOutState = A7.State;
                }
                else
                {
                    B0.NewOutState = SignalState.Z;
                    B1.NewOutState = SignalState.Z;
                    B2.NewOutState = SignalState.Z;
                    B3.NewOutState = SignalState.Z;
                    B4.NewOutState = SignalState.Z;
                    B5.NewOutState = SignalState.Z;
                    B6.NewOutState = SignalState.Z;
                    B7.NewOutState = SignalState.Z;
                }
            }
            else
            {
                if (Inputs[2] != portB)
                {
                    for (int i = 0; i < portB.Length; i++)
                        portB[i].DeactivateDriver();

                    Inputs[2] = portB;
                    Outputs[0] = portA;
                }

                if (OEn.State == SignalState.L)
                {
                    A0.NewOutState = B0.State;
                    A1.NewOutState = B1.State;
                    A2.NewOutState = B2.State;
                    A3.NewOutState = B3.State;
                    A4.NewOutState = B4.State;
                    A5.NewOutState = B5.State;
                    A6.NewOutState = B6.State;
                    A7.NewOutState = B7.State;
                }
                else
                {
                    A0.NewOutState = SignalState.Z;
                    A1.NewOutState = SignalState.Z;
                    A2.NewOutState = SignalState.Z;
                    A3.NewOutState = SignalState.Z;
                    A4.NewOutState = SignalState.Z;
                    A5.NewOutState = SignalState.Z;
                    A6.NewOutState = SignalState.Z;
                    A7.NewOutState = SignalState.Z;
                }
            }
        }
        #endregion Public Methods

    }
}
